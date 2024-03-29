import { Color } from "../libs/Colors";
import { decryptSecret } from "../libs/CommandHelper";
import Data from "../libs/Data";
import Encryption from "../libs/Encryption";
import { LogSuccess } from "../libs/Help";
import Input from "../libs/Input";
import AwsSSM from "../libs/Store/ssm.aws";
import { deepCopy } from "../libs/Utils";
import { secret } from "../types/types";

const input = new Input();

export default async function SyncSecrets(filename: string) {
  // Inputs
  const _filename =
    process.env.FILENAME || filename || (await input.ReadInput("File Name: "));

  // Verifications
  if (!_filename) throw new Error("Missing File Name.");

  // Processing
  const data = new Data(_filename);
  let encryption: Encryption | undefined;
  if (data.HasSecrets()) {
    const privateKey = (await data.GetPrivateKey()) as string;
    const publicKey = (await data.GetPublicKey()) as string;
    if (Encryption.HasKeyPair(privateKey, publicKey)) {
      encryption = new Encryption(privateKey, publicKey);
    }
  }

  // Decrypt values
  let values: secret[] = [];
  values = await decryptSecret(data, encryption);

  // Delete value that has no name, type or overwrite options defined
  // these 3 are required to setup SSM Properly.
  values = values.filter(
    (value) => value.name && value.type && value.overwrite
  );

  console.log(Color("⇪", "FgBlue"), "aws.ssm: Starting Sync");
  const awsProcessingPerRequestedRegions =
    data.GetConfig("aws")?.regions?.map((region) => {
      const ssm = new AwsSSM({}, region, data.GetVariables());
      return ssm.Sync(deepCopy(values) as Array<any>);
    }) || [];

  await Promise.all(awsProcessingPerRequestedRegions);

  LogSuccess("aws.ssm: Sync Completed");

  // Output
  LogSuccess("Values Synced !");
}
