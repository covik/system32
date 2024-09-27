import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const domainSlug = 'zarapromet-hr';

export function resources(): unknown {
  const dnsZone = new cloudflare.Zone(
    `${domainSlug}-zone`,
    {
      zone: 'zarapromet.hr',
      accountId: 'f6f07d41cae3f7e691aeaf018292e276',
      plan: 'free',
      type: 'full',
    },
    {
      protect: true,
    },
  );

  new cloudflare.ZoneSettingsOverride(`${domainSlug}-security`, {
    zoneId: dnsZone.id,
    settings: {
      ssl: 'strict',
      alwaysUseHttps: 'on',
      securityLevel: 'high',
      browserCheck: 'on',
      challengeTtl: 1800,
      // waf: 'on', // needs Pro plan
      opportunisticEncryption: 'on',
      automaticHttpsRewrites: 'on',
      minTlsVersion: '1.3',
    },
  });

  const mxRecords = [
    { name: dnsZone.zone, priority: 1, value: 'aspmx.l.google.com.' },
    { name: dnsZone.zone, priority: 5, value: 'alt1.aspmx.l.google.com.' },
    { name: dnsZone.zone, priority: 5, value: 'alt2.aspmx.l.google.com.' },
    { name: dnsZone.zone, priority: 10, value: 'alt3.aspmx.l.google.com.' },
    { name: dnsZone.zone, priority: 10, value: 'alt4.aspmx.l.google.com.' },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.Record(`${domainSlug}-mx-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'MX',
      content: record.value,
      priority: record.priority,
      ttl: 3600,
    });
  });

  const txtRecords = [
    {
      name: 'google._domainkey.zarapromet.hr',
      value:
        'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmXaVcyaN0kG6S+3MmxXIOYycyR9K1A71K88TMHGpQdayD2c2eVtsg8wfnQJPiF6/hup3j5RYSED+ec3P7+Ykcg/OxsqervWXzhRFYrpxOZCNtSXeHIxmWbVABqUJS+v65OWaHV5N6HvA1aLFPyUZ6/Sbg5CR9+FqreRChvt0HL5gBA6emRIQEb+U/N0na9FinAPhHwzB7aJSSzwU4m3tCn7k1UIIs1R/eYj1drca73yf+xJKVPLJHZZGV6H+27zBD2eeDJUGscj8yj/Sfz5bv+hMbG+D00P3X8utDeie7T4sNmP9clXGRmcNJ4qEPujP+L0s8Jb1wifVIwnsGJ3WvQIDAQAB',
    },
    {
      name: dnsZone.zone,
      value: 'v=spf1 include:_spf.google.com ~all',
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.Record(`${domainSlug}-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: 3600,
    });
  });

  const hostnames = [dnsZone.zone, pulumi.interpolate`*.${dnsZone.zone}`];
  pulumi.all(hostnames).apply((hosts) => {
    hosts.forEach((hostname, index) => {
      new cloudflare.Record(`${domainSlug}-a-${index}`, {
        zoneId: dnsZone.id,
        name: hostname,
        type: 'A',
        content: '46.101.159.36',
        ttl: 3600,
      });
    });
  });

  return {
    nameservers: dnsZone.nameServers,
  };
}
