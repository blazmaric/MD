export const config = {
  port: parseInt(process.env.PORT || '8081', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://mduser:password@postgres:5432/mikrotik_dashboard'
  },

  mikrotik: {
    baseUrl: process.env.MT_BASE_URL || 'https://172.20.50.6',
    host: (process.env.MT_BASE_URL || 'https://172.20.50.6').replace(/^https?:\/\//, ''),
    user: process.env.MT_USER || 'api',
    pass: process.env.MT_PASS || '',
    tlsCaPath: process.env.MT_TLS_CA_PATH || '/app/certs/mikrotik-ca.crt',
    sshPort: parseInt(process.env.MT_SSH_PORT || '22', 10),
    interfaces: {
      lte: process.env.LTE_IFACE || 'lte1',
      wlan: process.env.WLAN_IFACE || 'wlan2.4',
      vxlan: process.env.VXLAN_IFACE || 'Vxlan'
    }
  },

  polling: {
    summarySeconds: parseInt(process.env.SUMMARY_POLL_SECONDS || '10', 10),
    staleSeconds: parseInt(process.env.SUMMARY_STALE_SECONDS || '20', 10),
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10)
  },

  admin: {
    user: process.env.ADMIN_USER || 'admin',
    pass: process.env.ADMIN_PASS || 'admin'
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    cookieName: process.env.COOKIE_NAME || 'md_auth',
    domain: process.env.DOMAIN || 'md.m-host.si'
  }
};
