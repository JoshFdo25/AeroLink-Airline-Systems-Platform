$ErrorActionPreference = "Continue"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " AeroLink Infrastructure Destruction Sequence" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Sweeping for orphaned Kubernetes Load Balancers..." -ForegroundColor Yellow
$lbs = aws elb describe-load-balancers --query "LoadBalancerDescriptions[*].LoadBalancerName" --output text
if ($lbs) {
    $lbs -split '\s+' | ForEach-Object {
        if ($_) {
            Write-Host "  -> Force deleting hidden Load Balancer: $_" -ForegroundColor Red
            aws elb delete-load-balancer --load-balancer-name $_
        }
    }
    Write-Host "  -> Waiting 10 seconds for AWS to detach Network Interfaces..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 10
} else {
    Write-Host "  -> No orphaned Load Balancers found." -ForegroundColor Green
}

Write-Host "[2/3] Sweeping for orphaned Network Interfaces & Security Groups..." -ForegroundColor Yellow
$vpcId = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=aerolink-dev-vpc" --query "Vpcs[0].VpcId" --output text
if ($vpcId -and $vpcId -ne "None") {
    $enis = aws ec2 describe-network-interfaces --filters "Name=vpc-id,Values=$vpcId" --query "NetworkInterfaces[*].NetworkInterfaceId" --output text
    if ($enis) {
        $enis -split '\s+' | ForEach-Object {
            if ($_) {
                Write-Host "  -> Force deleting hidden ENI: $_" -ForegroundColor Red
                aws ec2 delete-network-interface --network-interface-id $_ 2>$null
            }
        }
    }

    $sgs = aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text
    if ($sgs) {
        $sgs -split '\s+' | ForEach-Object {
            if ($_) {
                Write-Host "  -> Force deleting hidden Security Group: $_" -ForegroundColor Red
                aws ec2 delete-security-group --group-id $_ 2>$null
            }
        }
    }
    Write-Host "  -> VPC sweep complete." -ForegroundColor Green
}

Write-Host "[3/3] Emptying AWS SecretsManager Recycle Bin..." -ForegroundColor Yellow
aws secretsmanager delete-secret --secret-id aerolink-db-password-v2 --force-delete-without-recovery 2>$null
Write-Host "  -> DB Secret permanently deleted." -ForegroundColor Green

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Launching Terraform Destroy..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

terraform destroy -auto-approve
