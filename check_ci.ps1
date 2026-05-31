$runs = Invoke-RestMethod -Uri 'https://api.github.com/repos/JoshFdo25/AeroLink-Airline-Systems-Platform/actions/runs?per_page=1'
$jobsUrl = $runs.workflow_runs[0].jobs_url
$jobs = Invoke-RestMethod -Uri $jobsUrl
$failedJob = $jobs.jobs | Where-Object { $_.conclusion -eq 'failure' }

if ($failedJob) {
    Write-Output ("Failed job: " + $failedJob.name)
    $logUrl = 'https://api.github.com/repos/JoshFdo25/AeroLink-Airline-Systems-Platform/actions/jobs/' + $failedJob.id + '/logs'
    Write-Output ("Log URL: " + $logUrl)
    # Fetch logs if possible (sometimes GitHub requires auth for logs, but let's try)
    try {
        $logs = Invoke-RestMethod -Uri $logUrl
        $logs[-50..-1]
    } catch {
        Write-Output "Could not fetch logs directly without auth. $logUrl"
    }
} else {
    Write-Output 'No failed jobs found in the latest run.'
}
