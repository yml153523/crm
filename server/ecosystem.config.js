module.exports = {
  apps: [{
    name: 'crm-server',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 5011
    },
    error_file: '/var/log/crm/error.log',
    out_file: '/var/log/crm/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
