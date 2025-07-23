import * as cloudflare from '@pulumi/cloudflare';

const domainSlug = 'luigitrans-hr';

export function resources(): unknown {
  const dnsZone = new cloudflare.Zone(
    `${domainSlug}-zone`,
    {
      zone: 'luigitrans.hr',
      accountId: 'f6f07d41cae3f7e691aeaf018292e276',
      plan: 'free',
      type: 'full',
    },
    {
      protect: true,
    },
  );

  const dnssec = new cloudflare.ZoneDnssec(`${domainSlug}-dnssec`, {
    zoneId: dnsZone.id,
  });

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
    { name: dnsZone.zone, priority: 0, value: 'luigitrans.hr.', ttl: 14400 },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.Record(`${domainSlug}-mx-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'MX',
      content: record.value,
      priority: record.priority,
      ttl: record.ttl,
    });
  });

  const txtRecords = [
    {
      name: dnsZone.zone,
      value: '"v=spf1 +a +mx +ip4:178.63.45.97 ~all"',
      ttl: 14400,
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.Record(`${domainSlug}-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: record.ttl,
    });
  });

  const aRecords = [
    {
      name: dnsZone.zone,
      value: '178.63.45.97',
      ttl: 14400,
    },
  ];

  aRecords.forEach((record, index) => {
    new cloudflare.Record(`${domainSlug}-a-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'A',
      content: record.value,
      ttl: record.ttl,
    });
  });

  return {
    nameservers: dnsZone.nameServers,
    ds: {
      keyTag: dnssec.keyTag,
      algorithm: dnssec.algorithm,
      digestType: dnssec.digestType,
      digest: dnssec.digest,
    },
  };
}
