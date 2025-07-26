import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const domainSlug = 'zarafleet-com';

export function resources(): unknown {
  const dnsZone = new cloudflare.Zone(
    `${domainSlug}-zone`,
    {
      name: 'zarafleet.com',
      account: {
        id: 'f6f07d41cae3f7e691aeaf018292e276',
      },
      type: 'full',
    },
    {
      protect: true,
    },
  );

  // Because this domain is registered at CloudFlare,
  // we don't have to manually update DNS records
  new cloudflare.ZoneDnssec(`${domainSlug}-dnssec`, {
    zoneId: dnsZone.id,
  });

  const mxRecords = [
    { name: dnsZone.name, priority: 10, value: 'mx.zoho.eu.' },
    { name: dnsZone.name, priority: 20, value: 'mx2.zoho.eu.' },
    { name: dnsZone.name, priority: 40, value: 'mx.zoho.eu.' },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`${domainSlug}-mx-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'MX',
      content: record.value,
      priority: record.priority,
      ttl: 14400,
    });
  });

  const txtRecords = [
    {
      name: 'zmail._domainkey.zarafleet.com',
      value:
        'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDBO7cdFtTgMgNvWCBp5+2SFbBWqd60qydynfGeliJroK1a5McG7yMjt93zEZABRC/BhoWITJEZ15G0iNncQ4m9pSM/pJ3bxm9pO4X6dA08q3d6NpRF2ezsxp2JEXPRZE8ZDC8xhEElrPUBzFWTdshq81yYW9Kap8e/5I6mAO4dSQIDAQAB',
    },
    {
      name: dnsZone.name,
      value: 'v=spf1 include:zoho.eu ~all',
    },
    {
      name: dnsZone.name,
      value: 'zoho-verification=zb24461793.zmverify.zoho.eu',
    },
    {
      name: '_dmarc',
      value:
        'v=DMARC1;  p=none; rua=mailto:01eeeb5c4062493a98e526872bb02a24@dmarc-reports.cloudflare.net;',
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`${domainSlug}-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: 3600,
    });
  });

  const hostnames = [
    pulumi.interpolate`old.${dnsZone.name}`,
    pulumi.interpolate`app.${dnsZone.name}`,
  ];
  pulumi.all(hostnames).apply((hosts) => {
    hosts.forEach((hostname, index) => {
      new cloudflare.DnsRecord(`${domainSlug}-cname-${index}`, {
        zoneId: dnsZone.id,
        name: hostname,
        type: 'CNAME',
        content: 'zth.dev',
        ttl: 86400,
      });
    });
  });

  return {
    nameservers: dnsZone.nameServers,
  };
}
