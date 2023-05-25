export class DockerCredentials {
  private username = '';
  private password = '';

  public static forRegistry(url: string): DockerCredentials {
    return new DockerCredentials(url);
  }

  private constructor(private readonly registryURL: string) {}

  public asUser(username: string): DockerCredentials {
    this.username = username;
    return this;
  }

  public withPassword(password: string): DockerCredentials {
    this.password = password;
    return this;
  }

  public toJSON(): string {
    if (this.registryURL === '')
      throw new TypeError('Registry URL must not be empty');
    if (this.username === '') throw new TypeError('Username must not be empty');
    if (this.password === '') throw new TypeError('Password must not be empty');

    const dockerConfigSpecification = {
      auths: {
        [this.registryURL]: {
          auth: this.getCredentialsAsBase64String(),
        },
      },
    };

    return JSON.stringify(dockerConfigSpecification);
  }

  private getCredentialsAsBase64String(): string {
    const separator = ':';
    const credentials = `${this.username}${separator}${this.password}`;

    return Buffer.from(credentials, 'utf-8').toString('base64');
  }
}
