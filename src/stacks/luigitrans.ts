import * as cloudflare from '@pulumi/cloudflare';
import * as pulumi from '@pulumi/pulumi';

const domainSlug = 'luigitrans-hr';

export function resources(): unknown {
  const dnsZone = new cloudflare.Zone(
    `${domainSlug}-zone`,
    {
      name: 'luigitrans.hr',
      account: {
        id: 'f6f07d41cae3f7e691aeaf018292e276',
      },
      type: 'full',
    },
    {
      protect: true,
    },
  );

  const dnssec = new cloudflare.ZoneDnssec(`${domainSlug}-dnssec`, {
    zoneId: dnsZone.id,
  });

  const mxRecords = [
    { name: dnsZone.name, priority: 0, value: 'luigitrans.hr.', ttl: 300 },
  ];

  mxRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`${domainSlug}-mx-${index}`, {
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
      name: dnsZone.name,
      value: '"v=spf1 +a +mx +ip4:178.63.45.97 ~all"',
      ttl: 300,
    },
    {
      name: dnsZone.name,
      value:
        '"google-site-verification=aDPiYQcHYkg_6Df8HIX19Vj0JkHIDDEbhhwbNQufRP8"',
      ttl: 300,
    },
  ];

  txtRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`${domainSlug}-txt-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'TXT',
      content: record.value,
      ttl: record.ttl,
    });
  });

  const aRecords = [
    {
      name: dnsZone.name,
      value: '178.63.45.97',
      ttl: 14400,
    },
  ];

  aRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`${domainSlug}-a-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'A',
      content: record.value,
      ttl: record.ttl,
    });
  });

  const cnameRecords = [
    {
      name: pulumi.interpolate`mail.${dnsZone.name}`,
      value: dnsZone.name,
      ttl: 14400,
    },
  ];

  cnameRecords.forEach((record, index) => {
    new cloudflare.DnsRecord(`${domainSlug}-cname-${index}`, {
      zoneId: dnsZone.id,
      name: record.name,
      type: 'CNAME',
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
