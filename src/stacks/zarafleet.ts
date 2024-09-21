import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

export function resources(): unknown {
  const dnsZone = new cloudflare.Zone(
    'zarafleet-com-zone',
    {
      zone: 'zarafleet.com',
      accountId: 'f6f07d41cae3f7e691aeaf018292e276',
      plan: 'free',
      type: 'full',
    },
    {
      protect: true,
    },
  );

  const mxRecords = [
    { name: dnsZone.zone, priority: 10, value: 'mx.zoho.eu.' },
    { name: dnsZone.zone, priority: 20, value: 'mx2.zoho.eu.' },
    { name: dnsZone.zone, priority: 40, value: 'mx.zoho.eu.' },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.Record(`zarafleet-com-mx-${index}`, {
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
      name: dnsZone.zone,
      value: 'v=spf1 include:zoho.eu ~all',
    },
    {
      name: dnsZone.zone,
      value: 'zoho-verification=zb24461793.zmverify.zoho.eu',
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.Record(`zarafleet-com-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: 3600,
    });
  });

  const hostnames = [
    pulumi.interpolate`old.${dnsZone.zone}`,
    pulumi.interpolate`app.${dnsZone.zone}`,
  ];
  pulumi.all(hostnames).apply((hosts) => {
    hosts.forEach((hostname, index) => {
      new cloudflare.Record(`zarafleet-com-cname-${index}`, {
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
