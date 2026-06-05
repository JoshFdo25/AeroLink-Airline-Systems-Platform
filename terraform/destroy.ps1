$ErrorActionPreference = "Continue"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " AeroLink Infrastructure Destruction Sequence" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Gracefully tearing down Kubernetes resources (Load Balancers)..." -ForegroundColor Yellow
foreach ($kubeconfig in @("$HOME\.kube\config-primary", "$HOME\.kube\config-secondary")) {
    if (Test-Path $kubeconfig) {
        $env:KUBECONFIG = $kubeconfig
        Write-Host "  -> Purging Istio and Load Balancers in cluster: $kubeconfig" -ForegroundColor Cyan
        C:\Users\joshw\istio-1.22.1\bin\istioctl.exe uninstall -y --purge 2>$null
        kubectl delete namespace istio-system --ignore-not-found=true 2>$null
        kubectl delete namespace aerolink --ignore-not-found=true 2>$null
    }
}

Write-Host "`n[2/4] Sweeping for orphaned AWS Load Balancers..." -ForegroundColor Yellow
$regions = @("us-east-1", "eu-west-1")

foreach ($region in $regions) {
    Write-Host "  -> Checking Region: $region" -ForegroundColor Cyan
    
    # Sweep Classic Load Balancers (v1)
    $lbs = aws elb describe-load-balancers --region $region --query "LoadBalancerDescriptions[*].LoadBalancerName" --output text
    if ($lbs) {
        $lbs -split '\s+' | ForEach-Object {
            if ($_) {
                Write-Host "    -> Force deleting hidden Classic Load Balancer: $_" -ForegroundColor Red
                aws elb delete-load-balancer --region $region --load-balancer-name $_
            }
        }
    }

    # Sweep Network/Application Load Balancers (v2)
    $nlbs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[*].LoadBalancerArn" --output text
    if ($nlbs) {
        $nlbs -split '\s+' | ForEach-Object {
            if ($_) {
                Write-Host "    -> Force deleting hidden Network Load Balancer: $_" -ForegroundColor Red
                aws elbv2 delete-load-balancer --region $region --load-balancer-arn $_
            }
        }
    }

    if ($lbs -or $nlbs) {
        Write-Host "    -> Waiting 10 seconds for AWS to detach Network Interfaces..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 10
    } else {
        Write-Host "    -> No orphaned Load Balancers found." -ForegroundColor Green
    }
}

Write-Host "`n[3/4] Sweeping for orphaned Network Interfaces & Security Groups..." -ForegroundColor Yellow
foreach ($region in $regions) {
    Write-Host "  -> Checking Region: $region" -ForegroundColor Cyan
    $vpcId = aws ec2 describe-vpcs --region $region --filters "Name=tag:Name,Values=*vpc*" --query "Vpcs[0].VpcId" --output text 2>$null
    if ($vpcId -and $vpcId -ne "None") {
        $enis = aws ec2 describe-network-interfaces --region $region --filters "Name=vpc-id,Values=$vpcId" --query "NetworkInterfaces[*].NetworkInterfaceId" --output text
        if ($enis) {
            $enis -split '\s+' | ForEach-Object {
                if ($_) {
                    Write-Host "    -> Force deleting hidden ENI: $_" -ForegroundColor Red
                    aws ec2 delete-network-interface --region $region --network-interface-id $_ 2>$null
                }
            }
        }

        $sgs = aws ec2 describe-security-groups --region $region --filters "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text
        if ($sgs) {
            $sgs -split '\s+' | ForEach-Object {
                if ($_) {
                    Write-Host "    -> Force deleting hidden Security Group: $_" -ForegroundColor Red
                    aws ec2 delete-security-group --region $region --group-id $_ 2>$null
                }
            }
        }
        Write-Host "    -> VPC sweep complete for $region." -ForegroundColor Green
    }
}

Write-Host "`n[4/4] Emptying AWS SecretsManager Recycle Bin..." -ForegroundColor Yellow
$secrets = aws secretsmanager list-secrets --query "SecretList[?starts_with(Name, 'aerolink-')].Name" --output text
if ($secrets) {
    $secrets -split '\s+' | ForEach-Object {
        if ($_) {
            Write-Host "  -> Deleting secret $_" -ForegroundColor Red
            aws secretsmanager delete-secret --secret-id $_ --force-delete-without-recovery 2>$null
        }
    }
}
Write-Host "  -> DB Secrets permanently deleted." -ForegroundColor Green

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Launching Terraform Destroy..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

terraform init -upgrade
terraform destroy -auto-approve
