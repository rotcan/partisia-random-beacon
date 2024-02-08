Verifiable Random Beacon
This project uses Partisia Blockchain to create Pseudo Random Number Generator. It is implementing Threefry Random Number Generator. Reference : https://pdebuyl.be/blog/2016/threefry-rng.html. It is a counter based PRNG which uses a secret seed and counter to generate random numbers. To get an unbiased range, program is using Division with Rejection (Unbiased) method metioned here (https://www.pcg-random.org/posts/bounded-rands.html) This is acheived by a two step process

First Step
It is a contribution phases where multiple parties contribute secret inputs to the contract which are used to create the seed. ZK smart contracts in Partisia Blockchain can do computation (add/subtract etc) on secret inputs which allows us to generate a seed by xoring the input values.

Second Step
After contribution phase is finished, the secret inputs are not revealed but rather keep in secret state. In the second step user calls the contract with from, to and count as input. Contract computes the seed in secret and uses the private seed and public counter to generate random numbers. Counter is a public field which is stored in contract state and keeps incrementing as we generate random numbers
Apart from from, to and count as input, contract also takes in 32byte signature as input divided into 4 8byte inputs. Contract builds the signature from this input and attests the random number output and signature. So in this way contract can be used a verifiable compute service for other contracts. Like it is being used in this example for Raffle contract in Goerli network

Raffle 
This contract is on goerli testnet where we create NFT raffle and distribute NFT to users based on the random numbers generated from above contract. We are storing merkle root of messages signed by users on chain to save gas. Merkle tree is to be stored off chain. Also to prevent misuse, instead of using address as hash for merkle tree, we use message signed by address along index to ensure admin does not know random numbers correspond to which address. Also in the partisia contract, random numbers are attested with merkle root, count and range to verify if the numbers are generated for correct raffle. 
Start
To start, contract just takes nft uri as input
Finish
To finish the raffle, random numbers, range, count, root and proof from partisia contract are submitted. If proofs are verified, raffle is finished.
Claim nft
To claim the nft, anyone can send a transaction with correct address, index matching the random number to contract and merkle proof for the leaf. If all the proofs get verified, nft is transfered to the matching address.

Use cases
Random numbers for dice game
Random player matching in PvP games
In statistics where random numbers are required for sampling

### NFT raffle contract
Go to project root folder and then do the following steps

### `cd eth`

 The private we need to use to deploy the contract
### `export PRIVATE_KEY={}`

Compile and deploy the contract
### npx hardhat run deploy.ts --network goerli_testnet

Copy the deployed address contract to frontend/.env file's REACT_APP_RAFFLE_CONTRACT field
If any changes are done to contract, copy the abi file eth/artifacts/contracts/Raffle.sol/Raffle.json to frontend/src/abi/Raffle.json

### Partisia contract
Go to project root folder and then do the following steps

### `cd program`

### `cargo partisia-contract build -r`

Deploy the contract on test by going to this link  {https://browser.testnet.partisiablockchain.com/contracts/deploy}
Copy the deployed address to frontend/.env file's REACT_APP_RNG_CONTRACT field

### Frontend

### `cd frontend`

### `npm install`

### `npm run start`


