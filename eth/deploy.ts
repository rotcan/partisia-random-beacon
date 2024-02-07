import { ethers } from 'hardhat';
require('dotenv').config();

//PRIVATE_KEY="0x..." pnpm hardhat run deploy.ts --network goerli_testnet


function computeEthereumAddress(encodedKey: string, encoding:BufferEncoding) {
    let buffer = Buffer.from(encodedKey, encoding);
    return ethers.utils.computeAddress(buffer);
}


async function deploy(){
    const [deployer, account] = await ethers.getSigners();
    const Raffle = await ethers.getContractFactory('Raffle');
    if(process.env.PBC_CONTRACT && process.env.ZK_NODE_1 && process.env.ZK_NODE_2 && process.env.ZK_NODE_3 && process.env.ZK_NODE_4){
       
        const nodes = [
            computeEthereumAddress(process.env.ZK_NODE_1, "base64"),
            computeEthereumAddress(process.env.ZK_NODE_2, "base64"),
            computeEthereumAddress(process.env.ZK_NODE_3, "base64"),
            computeEthereumAddress(process.env.ZK_NODE_4, "base64"),
        ];

        
        const raffle = await Raffle.deploy(process.env.PBC_CONTRACT,nodes);
        await raffle.deployed();
        console.log('Raffle deployed to:', raffle.address);
    }else{
        console.log("PBC Contract and Computation nodes required as input");
    }
}

deploy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});