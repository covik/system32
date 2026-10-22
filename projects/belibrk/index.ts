import * as cloudflare from "@pulumi/cloudflare";

const domainSlug = "belibrk-makeup";

const dnsZone = new cloudflare.Zone(
	`${domainSlug}-zone`,
	{
		name: "belibrk.makeup",
		account: {
			id: "f6f07d41cae3f7e691aeaf018292e276",
		},
		type: "full",
	},
	{
		protect: true,
	},
);

const dnssec = new cloudflare.ZoneDnssec(`${domainSlug}-dnssec`, {
	zoneId: dnsZone.id,
	status: "active",
});

new cloudflare.DnsRecord(`${domainSlug}-cname`, {
	zoneId: dnsZone.id,
	name: dnsZone.name,
	type: "CNAME",
	content: "zth.dev",
	ttl: 1,
	proxied: true,
});

export const nameservers = dnsZone.nameServers;
export const ds = {
	keyTag: dnssec.keyTag,
	algorithm: dnssec.algorithm,
	digestType: dnssec.digestType,
	digest: dnssec.digest,
};
