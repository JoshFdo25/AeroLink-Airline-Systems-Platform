# install-monitoring.ps1

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " AeroLink Observability Setup (Prometheus & Grafana)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

if (!(Get-Command "helm" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Helm is not installed!" -ForegroundColor Red
    Write-Host "Please install Helm first:"
    Write-Host "  Using Winget:  winget install Helm.Helm"
    Write-Host "  Using Choco:   choco install kubernetes-helm"
    exit 1
}

Write-Host "`n[1/3] Adding Prometheus Community Helm Repository..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

Write-Host "`n[2/3] Installing kube-prometheus-stack (Prometheus, Grafana, Alertmanager)..."
# We deploy it into the 'monitoring' namespace to keep it organized
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace

Write-Host "`n[3/3] Waiting for pods to be ready..."
kubectl wait --namespace monitoring --for=condition=ready pod --selector=release=prometheus --timeout=300s

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host " Observability Stack Deployed Successfully!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "`nTo access Grafana locally, run:"
Write-Host "kubectl port-forward svc/prometheus-grafana 8080:80 -n monitoring"
Write-Host "Then open http://localhost:8080 (Default login: admin / prom-operator)"
