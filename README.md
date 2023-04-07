<div align="center">

<img src="./docs/vault.png" alt="Project Logo" width="256">

<h2>Yet Another Tool - Vault</h2>

<p>A CLI tool to manage application secrets, built with AWS SSM Support.</p>
<p>You can commit you configurations and encrypt your secrets, share the private key through AWS SSM Secure String and more !</p>

<p align="center">
  <a href="https://github.com/yet-another-tool/yat-vault/issues">Report Bug</a>
  ·
  <a href="https://github.com/yet-another-tool/yat-vault/issues">Request Feature</a>
</p>
</div>

---

<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about">About</a>
    </li>
    <li><a href="#installation">Installation</a></li>
    <li>
      <a href="#usage">Usage</a>
    </li>
    <li><a href="#changelog">Changelog</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>
---

## About

## Installation

```bash
npm install -g @yetanothertool/yat-vault
```

---

## Usage

### Create new Key Pair

```bash
yat-vault --key-gen --key-name test
```

> It creates a key pair named:
> _Private Key:_ `test.key` and _Public Key:_ `test.pub`

#### There is multiple ways to load the keys

**Environment Variables**

```bash
export PRIVATE_KEY=$(cat test.key | base64)
export PUBLIC_KEY=$(cat test.pub | base64)
```

_or (Not Recommended)_

```bash
export PRIVATE_KEY=$(cat test.key)
export PUBLIC_KEY=$(cat test.pub)
```

**secret file**

Update the following keys to use your **local** key pair:

- `_configurations.publicKeyPath`
- `_configurations.privateKeyPath`

Update the following keys to use your **AWS** key pair:

- `_configurations.aws.publicKeyPath`
  - _This path must be a SSM path_
- `_configurations.aws.privateKeyPath`
  - _This path must be a SSM path_
- `_configurations.aws.awsRegion`
  - _This region must be the one containing the parameters_

---

### Create new Secret File

```bash
mkdir vault/
yat-vault --create --filename ./vault/test

# or to create it in the current directory
yat-vault --create --filename test
```

> It generates an empty secret file named `test.yml`

#### The secret file structure

> See the example directory.

The file is split in two main sections:

- **\_values**
- **\_configurations**

The **\_values** section defined your values to save in the vault.  
This is an array containing the parameter using this format:

```yaml
_values:
    - name: /the/ssm/path/with/the/name/of/your/parameter
    value: The Value to store or encrypt
    description: an optional description
    type: String|SecureString|StringList
    overwrite: false
```

You can use a concept of **variables** to dynamically set the **name** of your parameter.  
To do so you must define the key/value in the `_configurations.variables` array.

```yaml
_values:
    - name: /{tenant}/{project_name}/{stage}/password
    value: my super password that will be encrypted
    description: password is safe here
    type: SecureString
    overwrite: false

_configurations:
    variables:
        tenant: wl
        project_name: yat-vault
        stage: env:STAGE
```

The **variables** array contains the value for each key. They will be automatically replaced when syncing.  
You can also use the **environment variables**.  
You simply prepend: `env:` followed by the environment name.

**AWS**:

This object has the `regions` array, it let you deploy quickly using the multi region approach.
the variable `{region}` automatically resolves to the current region, this way you can specify the region in the parameter name if needed.

---

### Edit Secret File

```bash
yat-vault --edit --filename test.yml
```

It opens `vi` to let you update your configuration, once you save the file, it automatically encrypt the new values.

> As of V0.0.0, it doesn't refresh/encrypt everything if you change the key pair.
> So DON'T change the key pair. You will get a weird behaviour.

---

### Print Secret File Values

> **Be careful, this command expose all your secrets on your terminal !**

```bash
yat-vault --print --filename test.yml
```

It decrypts and prints all values on your screen.

---

### Encrypt Secret File

You don't have `vi`; You don't like `vi`; No problem.  
This command encrypt your file.

```bash
yat-vault --encrypt --filename test.yml
```

---

### Upload your Key pair

This command saves your key pair in AWS, using the configuration defined in the secret file.
You must specify an AWS region (Currently, only AWS is supported)

```bash
yat-vault --upload --filename test.yml --region ca-central-1 --provider aws
```

This way your CI, developers and etc can use the secrets without sharing the password.

> If you setup a passphrase, you will have to share it for now.

---

### Sync Your local secrets to your provider

To sync your local values to the cloud

```bash
yat-vault --sync --filename test.yml
```

The `overwrite` option determines if you can overwrite the values in SSM.  
This command is verbose to let you know what is going on.

---

## Changelog

The [TODO](./TODO)

### V0.0.0 - Alpha - 2023-04-07

- First requirements implemented

---

## Contributing

1. Create a Feature Branch
2. Commit your changes
3. Push your changes
4. Create a PR

<details>
<summary>Working with your local branch</summary>

**Branch Checkout:**

```bash
git checkout -b <feature|fix|release|chore|hotfix>/prefix-name
```

> Your branch name must starts with [feature|fix|release|chore|hotfix] and use a / before the name;
> Use hyphens as separator;
> The prefix correspond to your Kanban tool id (e.g. abc-123)

**Keep your branch synced:**

```bash
git fetch origin
git rebase origin/master
```

**Commit your changes:**

```bash
git add .
git commit -m "<feat|ci|test|docs|build|chore|style|refactor|perf|BREAKING CHANGE>: commit message"
```

> Follow this convention commitlint for your commit message structure

**Push your changes:**

```bash
git push origin <feature|fix|release|chore|hotfix>/prefix-name
```

**Examples:**

```bash
git checkout -b release/v1.15.5
git checkout -b feature/abc-123-something-awesome
git checkout -b hotfix/abc-432-something-bad-to-fix
```

```bash
git commit -m "docs: added awesome documentation"
git commit -m "feat: added new feature"
git commit -m "test: added tests"
```

</details>

### Local Development

```bash
npm install
npm run build
```

## License

Distributed under the MIT License. See LICENSE for more information.

## Contact

- Tommy Gingras @ tommy@studiowebux.com | Studio Webux

<div>
<b> | </b>
<a href="https://www.buymeacoffee.com/studiowebux" target="_blank"
      ><img
        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
        alt="Buy Me A Coffee"
        style="height: 30px !important; width: 105px !important"
/></a>
<b> | </b>
<a href="https://webuxlab.com" target="_blank"
      ><img
        src="https://webuxlab-static.s3.ca-central-1.amazonaws.com/logoAmpoule.svg"
        alt="Webux Logo"
        style="height: 30px !important"
/> Webux Lab</a>
<b> | </b>
</div>