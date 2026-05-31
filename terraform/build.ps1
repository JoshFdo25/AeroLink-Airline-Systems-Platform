$ErrorActionPreference = "Continue"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " AeroLink Infrastructure Build Sequence" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/8] Running Terraform Apply..." -ForegroundColor Yellow
terraform apply -auto-approve

Write-Host "[2/8] Authenticating to Kubernetes..." -ForegroundColor Yellow
aws eks update-kubeconfig --region us-east-1 --name aerolink-dev-cluster
aws eks create-access-entry --cluster-name aerolink-dev-cluster --principal-arn arn:aws:iam::643942183295:user/AeroLink-Admin 2>$null
aws eks associate-access-policy --cluster-name aerolink-dev-cluster --principal-arn arn:aws:iam::643942183295:user/AeroLink-Admin --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy --access-scope type=cluster 2>$null

Write-Host "[3/8] Retrieving New AWS Credentials..." -ForegroundColor Yellow
$dbEndpoint = aws rds describe-db-clusters --db-cluster-identifier aerolink-aurora --query "DBClusters[0].Endpoint" --output text
$secretArn = aws rds describe-db-clusters --db-cluster-identifier aerolink-aurora --query "DBClusters[0].MasterUserSecret.SecretArn" --output text
$secretString = aws secretsmanager get-secret-value --secret-id $secretArn --query "SecretString" --output text
$dbPassword = ($secretString | ConvertFrom-Json).password

# URL Encode password
[Reflection.Assembly]::LoadWithPartialName("System.Web") | Out-Null
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($dbPassword)

$redisEndpoint = aws elasticache describe-cache-clusters --cache-cluster-id aerolink-redis --show-cache-node-info --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text

Write-Host "  -> Aurora Endpoint: $dbEndpoint"
Write-Host "  -> Redis Endpoint: $redisEndpoint"

Write-Host "[4/8] Updating ConfigMap..." -ForegroundColor Yellow
$configPath = "..\k8s\base\services\configmap.yaml"
$configMap = Get-Content $configPath -Raw
$newDbUrl = "postgresql://postgres:${encodedPassword}@${dbEndpoint}:5432/postgres?schema=public&sslmode=no-verify"
$newRedisUrl = "redis://${redisEndpoint}:6379"

$configMap = $configMap -replace 'DATABASE_URL:.*', "DATABASE_URL: `"$newDbUrl`""
$configMap = $configMap -replace 'REDIS_URL:.*', "REDIS_URL: `"$newRedisUrl`""
Set-Content -Path $configPath -Value $configMap

Write-Host "  -> Committing and pushing ConfigMap to GitHub..."
git add $configPath
git commit -m "chore: auto-update database and redis urls for new cluster"
git push origin main

Write-Host "[5/8] Installing Kubernetes Addons..." -ForegroundColor Yellow
C:\Users\joshw\istio-1.22.1\bin\istioctl.exe install --set profile=default -y
kubectl apply --server-side -f https://github.com/kedacore/keda/releases/download/v2.14.0/keda-2.14.0.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

Write-Host "[6/8] Launching ArgoCD and AeroLink Namespaces..." -ForegroundColor Yellow
kubectl create namespace aerolink 2>$null
kubectl label namespace aerolink istio-injection=enabled --overwrite
kubectl create namespace argocd 2>$null
kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f ..\k8s\argocd\application.yaml

Write-Host "[7/8] Waiting for cluster to stabilize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "[8/8] Database Synchronization & Seeding..." -ForegroundColor Yellow
kubectl run db-proxy --image=alpine/socat --port=5432 -n aerolink -- tcp-listen:5432,fork,reuseaddr tcp:${dbEndpoint}:5432
Write-Host "  -> Waiting for db-proxy pod to start..."
Start-Sleep -Seconds 15

# Start port forward in the background
$portForward = Start-Process -FilePath "kubectl" -ArgumentList "port-forward pod/db-proxy 5433:5432 -n aerolink" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

Write-Host "  -> Pushing Prisma Schema..."
$env:DATABASE_URL = "postgresql://postgres:${encodedPassword}@127.0.0.1:5433/postgres?schema=public"
Set-Location -Path ".."
npx prisma@5 db push --schema combined-schema.prisma --accept-data-loss

Write-Host "  -> Cleaning up proxy..."
Stop-Process -Id $portForward.Id -Force 2>$null
kubectl delete pod db-proxy -n aerolink 2>$null

Write-Host "  -> Waiting for Istio Load Balancer to come online..."
$lbUrl = ""
while (-not $lbUrl -or $lbUrl -eq "None") {
    $lbUrl = aws elb describe-load-balancers --query "LoadBalancerDescriptions[0].DNSName" --output text 2>$null
    if (-not $lbUrl -or $lbUrl -eq "None") { Start-Sleep -Seconds 5 }
}

Write-Host "  -> Seeding Admin User through Load Balancer ($lbUrl)..."
$success = $false
$retry = 0
while (-not $success -and $retry -lt 12) {
    try {
        Invoke-RestMethod -Method Post -Uri "http://$lbUrl/api/auth/seed-admin" -ErrorAction Stop | Out-Null
        $success = $true
        Write-Host "  -> Admin User Seeded Successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  -> Waiting for routing rules to propagate. Retrying in 10s..."
        Start-Sleep -Seconds 10
        $retry++
    }
}

Set-Location -Path "terraform"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " AeroLink Cluster is LIVE and READY!" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
