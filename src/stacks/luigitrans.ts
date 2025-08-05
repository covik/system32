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
    status: 'active',
  });

  const mxRecords = [
    { name: dnsZone.name, priority: 1, value: 'smtp.google.com', ttl: 300 },
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
      value: '"v=spf1 include:_spf.google.com ~all"',
      ttl: 300,
    },
    {
      name: dnsZone.name,
      value:
        '"google-site-verification=aDPiYQcHYkg_6Df8HIX19Vj0JkHIDDEbhhwbNQufRP8"',
      ttl: 300,
    },
    {
      name: pulumi.interpolate`google._domainkey.${dnsZone.name}`,
      value:
        'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2935FKBlfuIioHE+1x7j4JUnsh6fxr1sOuPtErmF3ogLfjXw0o0kR/8dcOSiMClHt4Aa+4prfwG5x96rzA6XC9YSkx6eVluseqvgOnmXf/Yj62haZly3Y6iA6zjJpcmLNERaU26pkuBaLQ5PH+D5vtfTGnMum1kfqwyUUEPngdoAZS+9D5GIgty/jGTjQoWO6s60CJF5ZLDOtsww2KY4pG01GITO5YVH51cb2j38ZQnE7cewmkt7z+WjD60cu3azz4+sjZPasZkVaI9bwUS7BomJV3+qgkLGwuw3+khBpPMwZ3UyLf1gUgxHnUyWJzX4td+Zm3JCUn4Nj5VQje0bbQIDAQAB',
      ttl: 3600,
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
