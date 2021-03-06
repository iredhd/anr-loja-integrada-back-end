<h1 align="center">
    <img alt="Trailspot" src="https://res.cloudinary.com/iredhd/image/upload/v1593003031/artes-no-reino/7c86053342_xdqzgf.png" />
    <br>
    Artes no Reino - Loja Integrada
</h1>
<p align="center">
  <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/iredhd/anr-loja-integrada.svg">

  <img alt="Repository size" src="https://img.shields.io/github/repo-size/iredhd/anr-loja-integrada.svg">

  <a href="https://github.com/iredhd/trailspot/issues">
    <img alt="Repository issues" src="https://img.shields.io/github/issues/iredhd/anr-loja-integrada.svg">
  </a>
</p>

The content of this repository is a API of a system of sending encrypted digital files to [Artes no Reino](https://loja.artesnoreino.com.br) shoppers.

The [Artes no Reino](https://loja.artesnoreino.com.br) Marketplace was developed through the [Loja Integrada](https://lojaintegrada.com.br) platform, so there will be integrations with its APIs.

## Requirements
* NodeJS: 13.2.0
* Yarn: 1.19.1

## Installation
```
git clone https://github.com/iredhd/anr-loja-integrada-back-end.git anr-loja-integrada-back-end
cd anr-loja-integrada-back-end
cp .env.example .env
yarn
yarn dev
```
- Remember to edit yout .env with your personal data
- Remeber to move your Firebase key (json) to the root directory named as private.json

## Getting Started

|Route|Method|Description|
|:-:|:-:|:-:|
|[/order](#order) |POST|Send an order|

### Order
#### POST
##### Parameters

|Param|Type|Required|
|:-:|:-:|:-:|
|id|Integer|Yes|

##### Handling Success

###### Possible Status
|Code|Description|
|:-:|:-:|
|SUCCESS|Order sent and status changed on Loja Integrada API|
|PARTIAL_SUCCESS|Products sent but there are more itens in the order|

##### Handling Errors

###### Possible Status

|Code|Description|
|:-:|:-:|
|200|Order sent|
|400|Order not sent|

###### Error Codes

|Code|Description|
|:-:|:-:|
|ID_NOT_FOUND|Required ID not sent on parameters|
|ORDER_NOT_FOUND|Order not found on Loja Integrada API|
|NO_PRODUCTS_TO_SEND|The order requested doesn't have any product to send registered on firebase|
|EMAIL_FAIL|The email request has been failed. It can be about auth, server, etc.|

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
