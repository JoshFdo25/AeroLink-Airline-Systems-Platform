const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'api.github.com',
  path: '/repos/JoshFdo25/AeroLink-Airline-Systems-Platform/actions/runs?per_page=1',
  headers: {
    'User-Agent': 'Node.js'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data);
    const jobsUrl = runs.workflow_runs[0].jobs_url;
    
    https.get({ hostname: 'api.github.com', path: jobsUrl.replace('https://api.github.com', ''), headers: { 'User-Agent': 'Node.js' } }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const jobs = JSON.parse(data2);
        const failedJob = jobs.jobs.find(j => j.conclusion === 'failure');
        if (failedJob) {
          console.log('Failed Job:', failedJob.name);
          const logUrl = `https://api.github.com/repos/JoshFdo25/AeroLink-Airline-Systems-Platform/actions/jobs/${failedJob.id}/logs`;
          console.log('Log URL:', logUrl);
        } else {
          console.log('No failed jobs found.');
        }
      });
    });
  });
}).on('error', (e) => {
  console.error(e);
});
