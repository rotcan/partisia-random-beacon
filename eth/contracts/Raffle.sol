// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Raffle is ERC721URIStorage,Ownable  {
    //using Counters for Counters.Counter; 
    //Counters.Counter private _tokenIds;
    uint256 public _tokenIds;

    bytes21 public privateVotingPbcAddress;
    address[] public computationNodes;
    // address[] whitelistedUsers;
    // uint lastWhitelistedTimestamp;
    string public tokenUri;
    bool public isRaffleStarted;
    bytes32 public _merkleRoot;
    uint256 public _winners;
    uint256 public _minted;
    uint256 public _mintCount;
    uint256 public _totalCount;
    
    //Events
    //Start
    event RaffleStart(
        string tokenUri
    );
    //End
    event RaffleEnd(
        uint256 _winners,
        uint64[] values
    );
    //Claim
    event ClaimNFT(
        address user,
        uint256 index
    );


    constructor(
        bytes21 _pbcContractAddress, address[] memory _computationNodes
    ) ERC721("NftFactory", "NFT1") Ownable(msg.sender) {
        privateVotingPbcAddress = _pbcContractAddress;
        require(_computationNodes.length == 4, "Invalid computation node count");
        computationNodes = _computationNodes;
        isRaffleStarted=false;
    }

    
    function resetPbcValues(bytes21 _pbcContractAddress, address[] memory _computationNodes) public onlyOwner {
        privateVotingPbcAddress = _pbcContractAddress;
         computationNodes = _computationNodes;
    }


    function startRaffe(string calldata uri) public {
        tokenUri=uri;
        // delete whitelistedUsers;
        // lastWhitelistedTimestamp=0;
        isRaffleStarted=true;
        _mintCount=0;
        _minted=0;
        _winners=0;
        _totalCount=0;
        emit RaffleStart(tokenUri);
    }

    // function addToWhitelist(address to) public onlyOwner  {
    //     whitelistedUsers.push(to);
    //     lastWhitelistedTimestamp=block.timestamp;
    // }

    function createToken(address toAddress, string memory tokenURI) private returns (uint) {
         //_tokenIds.increment();
        uint256 newItemId = _tokenIds;
        _tokenIds=_tokenIds+1;
         
        _safeMint(toAddress, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function claimToken(uint256 index,bytes calldata signature, string calldata data, address to,
        bytes32[] calldata merkleProof) public {
            require( _winners & (1<< (index))>0, "Not a winner");
            require( _minted & (1<<(index)) ==0 , "Already minted");
            //Verify to is correct
            require(verifySignature(to, data,signature),"Invalid signature");
            //Verify merkle proof is correct. Verifies index
            checkProof(signature,index,_merkleRoot, merkleProof);
        //check already minted
        //set minted to true
        _minted = _minted | (1 << (index));
        //update mint count
        uint256 mintedId=_mintCount;
        _mintCount=_mintCount+1;
        //mint 
        createToken(to,tokenUri);
        emit ClaimNFT(to, mintedId);

    }

     function verifySignature(address signer,  string calldata data, bytes calldata signature) public pure returns(bool){
        string memory data_hash=_getMessageHash(data);
        console.log("data_hash",data_hash); 
        bytes32 signature_hash=getEthHash(data_hash,"66");
        console.log(_toLower(toHex(signature_hash)));
        //require(data_hash==hash,"Hash does not match");
        (bytes32 _r, bytes32 _s, uint8 _v) = splitSignature(signature);
        address signature_signer = ecrecover(signature_hash, _v, _r, _s);
        
        return signature_signer==signer;
    }


    function _getMessageHash(  string calldata data) public pure returns(string memory){
        return _toLower(toHexWithPrefix(keccak256(abi.encodePacked(data ))));
    }


    function splitSignature(
        bytes memory sig
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid signature length");

        assembly {
           
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }


    function getEthHash(string memory message, string memory length) public pure returns (bytes32){
        bytes memory prefix = "\x19Ethereum Signed Message:\n";
        bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix,length, message));
        return prefixedHashMessage;
    }
 

    function calculateRaffle( uint64[] calldata values,uint64 minValue,uint64 maxValue, uint rngTimestamp,
        bytes[] calldata _proofOfResult, bytes32 merkleRoot) public{
            //Check if random values are generated after last whitelist user
            // require(rngTimestamp>lastWhitelistedTimestamp,"Random values are older than last whitelist");
            require(isRaffleStarted==true, "Raffle is not started");
            require(minValue==0, "Min value should be 0");
            // require(maxValue==whitelistedUsers.length, "Max value does not cover all whitelisted users");
            _merkleRoot=merkleRoot;
            require(_proofOfResult.length == 4, "Not enough signatures");
            bytes32 digest = computeRngDigest(values,minValue,maxValue,rngTimestamp,merkleRoot);
            // For each of the 4 signatures:
            for (uint32 node = 0; node < 4; node++) {
                // The the signature from the input array.
                bytes calldata signature = _proofOfResult[node];
                // Verify that the address recovered from the signature matches one of the computation
                // nodes that we trust from the initialization of the contract.
                console.log("recover",ECDSA.recover(digest, signature));
                require(computationNodes[node] == ECDSA.recover(digest, signature),
                    "Could not verify signature");
            }

            //send nfts to winners
            isRaffleStarted=false;
            for(uint i=0;i<values.length;i++){
                _winners=_winners | (1 << values[i]);
            }
            _totalCount=values.length;
            emit RaffleEnd(_winners,values);
        }

    function computeRngDigest(
        uint64[] calldata values, uint64 minValue,uint64 maxValue, uint timestamp, bytes32 merkleRoot) public view returns (bytes32) {
        // The digest of the attested data follows the format:
        // sha256(attestation_domain_separator || pbc_contract_address || data), where
        // attestation_domain_separator is the hardcoded utf-8 encoding of the string
        // "ZK_REAL_ATTESTATION", pbc_contract_address is the address of the contract that requested
        // the attestation and data is the actual data to be signed.
        // For the voting case it means that compute the digest of
        // "ZK_REAL_ATTESTATION" || privateVotingPbcAddress || _voteId || _votesFor || _votesAgainst ||
        // We use abi.encodePacked to ensure the bytes are encoded in the same manner as on PBC.
        uint32 len=uint32(values.length);
        bytes32 hash=keccak256(abi.encodePacked(merkleRoot,uint256(minValue),uint256(maxValue),uint256(len)));
        string memory hashStr=_toLower(toHex(hash));
        console.log(hashStr);
        console.log(bytes(hashStr).length);

        bytes memory output;
        output = abi.encodePacked(output, "ZK_REAL_ATTESTATION");
        output = abi.encodePacked(output, privateVotingPbcAddress);
        output = abi.encodePacked(output, len);
        for (uint256 i = 0; i < values.length; i++) {
            output = abi.encodePacked(output, values[i]);
        }
        output = abi.encodePacked(output,minValue);
        output = abi.encodePacked(output,maxValue);
        output = abi.encodePacked(output, uint64(timestamp));
        output = abi.encodePacked(output, uint32(64));
        output = abi.encodePacked(output, hashStr);
        console.logBytes(output);
        
        return sha256(
           output);
    }

    

    function checkProof(
        bytes calldata signature,
        uint256 index,
        bytes32 merkleRoot,
        bytes32[] calldata merkleProof
    ) pure public {
         require(merkleRoot != 0, "Merkle root not present");
        bytes32 node = keccak256(
            abi.encodePacked(signature,index)
        );
        console.log(toHexWithPrefix(node));
        bool isValidProof = MerkleProof.verifyCalldata(
            merkleProof,
            merkleRoot,
            node
        );
        require(isValidProof, "Invalid proof.");

        
    }

    function toHex16 (bytes16 data) internal pure returns (bytes32 result) {
    result = bytes32 (data) & 0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000 |
          (bytes32 (data) & 0x0000000000000000FFFFFFFFFFFFFFFF00000000000000000000000000000000) >> 64;
    result = result & 0xFFFFFFFF000000000000000000000000FFFFFFFF000000000000000000000000 |
          (result & 0x00000000FFFFFFFF000000000000000000000000FFFFFFFF0000000000000000) >> 32;
    result = result & 0xFFFF000000000000FFFF000000000000FFFF000000000000FFFF000000000000 |
          (result & 0x0000FFFF000000000000FFFF000000000000FFFF000000000000FFFF00000000) >> 16;
    result = result & 0xFF000000FF000000FF000000FF000000FF000000FF000000FF000000FF000000 |
          (result & 0x00FF000000FF000000FF000000FF000000FF000000FF000000FF000000FF0000) >> 8;
    result = (result & 0xF000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000) >> 4 |
          (result & 0x0F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F00) >> 8;
    result = bytes32 (0x3030303030303030303030303030303030303030303030303030303030303030 +
           uint256 (result) +
           (uint256 (result) + 0x0606060606060606060606060606060606060606060606060606060606060606 >> 4 &
           0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F) * 7);
}

function toHex (bytes32 data) public pure returns (string memory) {
    return string (abi.encodePacked (  toHex16 (bytes16 (data)), toHex16 (bytes16 (data << 128))));
}


function toHexWithPrefix (bytes32 data) public pure returns (string memory) {
    return string (abi.encodePacked ("0x",  toHex16 (bytes16 (data)), toHex16 (bytes16 (data << 128))));
}

function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character...
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                // So we add 32 to make it lowercase
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}