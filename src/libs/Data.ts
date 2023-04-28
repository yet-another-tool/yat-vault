import { readFileSync, writeFileSync } from "fs";
import path from "node:path";
import { load, dump } from "js-yaml";
import Encryption from "./Encryption";
import { isBase64 } from "./Utils";
import AwsLoader from "./Loader/aws.ssm";
import { configurations, secret, IAWS, IOverride } from "../types/types";

export default class Data {
  private secretFilename: string;
  private secretPath: string;
  private configurations: configurations | null;
  private values: Array<secret> | null;

  private awsLoader: AwsLoader | null;

  constructor(secretFilename: string) {
    this.secretFilename = path.basename(secretFilename);
    this.secretPath = path.dirname(secretFilename);
    const data = this.Load();

    this.configurations = data.configurations;
    this.values = data.values;

    if (this.configurations?.aws) {
      this.awsLoader = new AwsLoader(this.configurations?.aws?.awsRegion);
    } else {
      this.awsLoader = null;
    }
  }

  public Save() {
    writeFileSync(
      path.resolve(path.join(this.secretPath, this.secretFilename)),
      dump({ _values: this.values, _configurations: this.configurations })
    );
  }

  public Load(): { configurations: configurations; values: Array<secret> } {
    const data = load(
      readFileSync(
        path.resolve(path.join(this.secretPath, this.secretFilename)),
        { encoding: "utf-8" }
      )
    ) as { _configurations: configurations; _values: Array<secret> };

    return {
      configurations: data._configurations,
      values: data._values,
    };
  }

  private ExtractKeyValue(value: string) {
    return isBase64(value)
      ? Buffer.from(value, "base64").toString("utf-8")
      : value;
  }

  public async GetPrivateKey(): Promise<string | undefined> {
    let filename = null;

    if (this.configurations?.aws?.privateKeyPath)
      try {
        const key = await this.awsLoader?.LoadPrivateKey(
          this.configurations?.aws.privateKeyPath
        );
        return Promise.resolve(key);
      } catch (e: any) {
        console.error(
          `WARN: aws.ssm: Path defined but '${e.message}' - '${this.configurations.aws.awsRegion}' -> '${this.configurations.aws.privateKeyPath}'`
        );
      }
    if (this.configurations?.privateKeyPath)
      filename = this.configurations?.privateKeyPath;
    if (process.env.PRIVATE_KEY)
      return Promise.resolve(this.ExtractKeyValue(process.env.PRIVATE_KEY));

    if (filename) {
      return Promise.resolve(
        readFileSync(path.resolve(path.join(this.secretPath, filename)), {
          encoding: "utf-8",
        }).toString()
      );
    }

    console.error(
      "WARN: No private key defined. You will be unable to Encrypt or Decrypt secrets"
    );
  }

  public async GetPublicKey(): Promise<string | undefined> {
    let filename = null;

    if (this.configurations?.aws?.publicKeyPath)
      try {
        const key = await this.awsLoader?.LoadPublicKey(
          this.configurations?.aws.publicKeyPath
        );
        return Promise.resolve(key);
      } catch (e: any) {
        console.error(
          `WARN: aws.ssm: Path defined but '${e.message}' - '${this.configurations.aws.awsRegion}' -> '${this.configurations.aws.publicKeyPath}'`
        );
      }
    if (this.configurations?.publicKeyPath)
      filename = this.configurations?.publicKeyPath;
    if (process.env.PUBLIC_KEY)
      return Promise.resolve(this.ExtractKeyValue(process.env.PUBLIC_KEY));

    if (filename) {
      return Promise.resolve(
        readFileSync(path.resolve(path.join(this.secretPath, filename)), {
          encoding: "utf-8",
        }).toString()
      );
    }

    console.error(
      "WARN: No public key defined. You will be unable to Encrypt secrets"
    );
  }

  public GetValues(): Array<secret> | null {
    return this.values;
  }

  public GetKeyValue(): any {
    if (this.values && this.values?.length > 0)
      return Object.fromEntries(
        this.values.map((value) => [value.name, value.value])
      );
  }

  public HasSecrets(): boolean {
    if (!this.values) return false;
    return (
      this.values?.filter((value) => value.type === "SecureString").length > 0
    );
  }

  public EncryptValues(encryption: Encryption): void {
    this.setValues(
      this.values?.map((value) => {
        if (
          value.type === "SecureString" &&
          !value.value.toString().startsWith("$enc:")
        )
          value.value = `$enc:${encryption
            .EncryptData(Buffer.from(value.value.toString()))
            .toString("base64")}`;
        return value;
      }) || []
    );
  }

  private setValues(data: Array<secret>) {
    this.values = data;
  }

  private async handleDefaultsAndOverrides(
    overrides: IOverride
  ): Promise<Array<secret>> {
    return Promise.all(
      this.values?.map(async (value) => {
        // Apply overrides if any
        if (overrides) {
          Object.keys(overrides).forEach((key) => {
            value.value = value.value.toString().replaceAll(
              new RegExp(`\\$\\{(${key})\\}|\\$\\{(${key}:-(.*?))\\}`, "g"), // `\\$\\{${key}.*?\\}`
              overrides[key]
            );
          });
        }

        // Apply defaults if any
        // Extract default value if any
        console.debug(value?.value?.toString());
        const regex = new RegExp(`\\$\\{.*?:-(.*?)\\}`);
        const val = value?.value?.toString().match(regex);
        if (val && val.length > 0) {
          console.debug(val);
          // Replace the variable with the default value
          value.value = value.value
            .toString()
            .replaceAll(
              new RegExp(`\\$\\{[\\w\\d\\s]+:-[\\w\\d\\s]+\\}`, "g"),
              val[1].toString()
            );
          console.log(value);
        }

        return value;
      }) || []
    );
  }

  public async DecryptValues(
    encryption: Encryption | undefined,
    passphrase: string = "",
    overrides: IOverride = {}
  ): Promise<Array<secret>> {
    try {
      let values = this.values || [];
      if (encryption) {
        values = await Promise.all(
          this.values?.map(async (value) => {
            // Decrypt secrets.
            if (value.type === "SecureString") {
              value.value = (
                await encryption.DecryptData(
                  Buffer.from(
                    value.value.toString().split("$enc:")[1],
                    "base64"
                  ),
                  passphrase || process.env.PASSPHRASE
                )
              ).toString();
            }
            return value;
          }) || []
        );
      }

      // Handle defaults and overrides
      values = await this.handleDefaultsAndOverrides(overrides);

      return Promise.resolve(values);
    } catch (e) {
      throw e;
    }
  }

  public GetConfig(provider: string): IAWS | null {
    // @ts-ignore
    if (!this.configurations || !this.configurations[provider])
      throw new Error("Provider configuration not found.");

    // @ts-ignore
    return this.configurations ? this.configurations[provider] : null;
  }

  public GetVariables(): Array<string | number> | undefined {
    return this.configurations?.variables;
  }
}
