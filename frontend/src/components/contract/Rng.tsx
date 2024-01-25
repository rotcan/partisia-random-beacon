import { useEffect, useState } from "react";
import { ConnectedWallet } from "../../ConnectedWallet";
import { RngContractState, deserializeRngContractState } from "../../contract/RandomGenerated";
import { RawZkContractData } from "./Index";
import { CLIENT } from "../../AppState";
import { BlockchainPublicKey } from "@partisiablockchain/zk-client";
import { AbiParser, ContractAbi } from "@partisiablockchain/abi-client";
import { TransactionApi } from "../../client/TransactionApi";
import { RandomApi } from "../../contract/RandomApi";
import { BN } from "bn.js";
import { Box, Button, Card, Divider, Grid, List, ListItem, Paper, Stack, TextField, styled } from "@mui/material";
import { wrapText } from "../../utils/utils";
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

interface Props {
    connectedWallet: ConnectedWallet;
    contractAddress: string | undefined,
}

interface ResetStateValue {
    maxValueLimit: number,
    minContributions: number,
}

const defaultResetStateVars = () => {
    return { minContributions: 2, maxValueLimit: 10 } as ResetStateValue;
}

interface NextValueVars {
    rangeStart: string,
    rangeEnd: string,
    count: number,

}

const defaultNextValueVars = (): NextValueVars => {
    return { id: "1", count: 1, rangeStart: "1", rangeEnd: "100" } as NextValueVars;
}
const INIT_CONTRIBUTION_META = '\x00';

const RngValueItem = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    display:'flex',
    justifyContent: 'flex-start'
  }));

const Rng = (props: Props) => {
    //Init contributions
    //Gen next value
    //Reset State
    //Set new admin
    const [lastHash, setLastHash] = useState<string | undefined>();
    const [lastError, setLastError] = useState<string | undefined>();
    const [contractState, setContractState] = useState<RngContractState | undefined>();
    const [engineKeys, setEngineKeys] = useState<BlockchainPublicKey[] | undefined>();
    const [contractAbi, setContractAbi] = useState<ContractAbi | undefined>();
    const [zkVars, setZKVars] = useState<{ key: number, value: any }[]>([]);
    const [resetStateVars, setResetStateVars] = useState<ResetStateValue>(defaultResetStateVars());
    const [newAdmin, setNewAdmin] = useState<string | undefined>();
    const [nextValueVars, setNextValueVars] = useState<NextValueVars>(defaultNextValueVars());
    const [initContribution, setInitContribution] = useState<string | undefined>();

    const updateContract = () => {
        const address = props.contractAddress;
        console.log("address", address);
        if (address === undefined || address === "") {
            throw new Error("No address provided");
        }
        //loading

        CLIENT.getContractData<RawZkContractData>(address).then((contract) => {
            if (contract != null) {
                console.log("contract.serializedContract.openState", contract.serializedContract);
                // Reads the state of the contract
                // Parses the contract abi
                if (contractAbi === undefined) {
                    const abiBuffer = Buffer.from(contract.abi, "base64");
                    const abi = new AbiParser(abiBuffer).parseAbi();
                    setContractAbi(abi.contract);
                }

                // Gets the public keys of the zk nodes attached to this contract.
                if (engineKeys === undefined) {
                    const engineKeys = contract.serializedContract.engines.engines.map((e) =>
                        BlockchainPublicKey.fromBuffer(Buffer.from(e.publicKey, "base64"))
                    );
                    setEngineKeys(engineKeys);
                }

                setZKVars(contract.serializedContract.variables);
                //console.log("contract.serializedContract.state",contract.serializedContract);
                const stateBuffer = Buffer.from(contract.serializedContract.openState.openState.data, "base64");

                const contractState = deserializeRngContractState({ state: stateBuffer });

                // const tbMap=new Map<string,string>();
                // for(const [k,v] of contractState.tokenBalances){
                //     tbMap.set(k.asString(),v.toString(10));
                // }

                // const nftMap=new Map<string,string>();
                // for(const [k,v] of contractState.nftMap){
                //     nftMap.set(k.asString(),v.toString(10));
                // }

                setContractState(contractState)
                console.log("state", contractState);
            } else {
                throw new Error("Could not find data for contract");
            }
        });
    }


    const getApi = () => {
        const transactionApi = new TransactionApi(props.connectedWallet, updateContract);
        console.log("Rng contractAddress ", props, props.contractAddress);
        if (props.contractAddress && contractAbi && engineKeys) {
            const api = new RandomApi({
                transactionApi, sender: props.connectedWallet.address,
                abi: contractAbi, engineKeys, contractAddress: props.contractAddress
            });
            return api;
        }
        return undefined;
    }


    useEffect(() => {
        updateContract();
    }, []);

    const isAdmin = (): boolean => {
        return contractState?.administrator?.asString() === props.connectedWallet.address;
    }

    const zkSubmitCount = (val: string): number => {
        if (zkVars && contractState) {
            return zkVars.filter(m => { return atob(m.value.information.data) === val }).length;
        }
        return 0;
    }

    const isInitDone = (): boolean => {
        return (contractState &&
            zkSubmitCount(INIT_CONTRIBUTION_META) >= contractState.minSetupContributions) ?? false;
    }

    const contributionsJSX = () => {
        return <div>Contributions done: {zkSubmitCount(INIT_CONTRIBUTION_META)} / {contractState?.minSetupContributions}</div>
    }

    const checkIsContributionValid = (str: string): boolean => {
        return /^\d+$/.test(str);
    }


    const submitInitContribution = () => {
        if (!initContribution) {
            alert("Input contribution")
            return;
        }
        const api = getApi();
        if (!api) {
            alert("Wait for contract to load")
            return;
        }
        api.addInitContribution(new BN(initContribution))
            .then((transactionHash) => {
                setLastHash(transactionHash);
            })
            .catch((msg) => {
                setLastError(msg.toString());
            });
    }

    const initContributionsJSX = () => {
        if (isInitDone())
            return <Paper variant="outlined" square={false} className="padding5 textAlignLeft">No more contributions required</Paper>
        return (<div>
            <label>Input initial contributions</label>
            <div>

                <input type="number" onChange={(e) => {
                    if (checkIsContributionValid(e.target.value)) {
                        setInitContribution(e.target.value)
                    }
                }
                } />
                <Button onClick={(e) => { e.preventDefault(); submitInitContribution(); }}>Submit Contribution</Button>
            </div>
        </div>
        )
    }

    const submitNextValueTxn = () => {
        if (!nextValueVars || nextValueVars.count === 0 || !nextValueVars.rangeEnd
            || !nextValueVars.rangeStart || nextValueVars.rangeStart === "0"
            || nextValueVars.rangeEnd === "0" || new BN(nextValueVars.rangeStart) > new BN(nextValueVars.rangeEnd)) {
            alert("Set next value vars")
            return;
        }
        const api = getApi();
        if (!api) {
            alert("Wait for contract to load")
            return;
        }
        api.getNextValues({
            count: nextValueVars.count, rangeEnd: new BN(nextValueVars.rangeEnd),
            rangeStart: new BN(nextValueVars.rangeStart)
        })
            .then((transactionHash) => {
                setLastHash(transactionHash);
            })
            .catch((msg) => {
                setLastError(msg.toString());
            });
    }



    const getNextValueJSX = () => {
        if (!isInitDone())
            return <div>Wait for init computation to finish. {contributionsJSX()}</div>
        return (
            <div>
                <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                    <div>Generate Next Value</div>
                    <Grid container spacing={1} justifyContent="center" >
                        <Grid item xs>
                            <TextField size="small" type="number" onChange={(e) => { setNextValueVars(current => ({ ...current, count: +e.target.value })) }} label="Count" />
                        </Grid>
                        <Grid item xs>
                            <TextField size="small" type="number" onChange={(e) => { setNextValueVars(current => ({ ...current, rangeStart: e.target.value })) }} label="Range Start" />
                        </Grid>
                        <Grid item xs>
                            <TextField size="small" type="number" onChange={(e) => { setNextValueVars(current => ({ ...current, rangeEnd: e.target.value })) }} label="Range End" />
                        </Grid>
                        <Grid item xs>
                            <Button onClick={(e) => { e.preventDefault(); submitNextValueTxn(); }}>Submit Txn</Button>
                        </Grid>
                    </Grid>
                </Paper >
            </div>
        )
    }

    const resetStateTxn = () => {
        if (!resetStateVars || !resetStateVars.maxValueLimit || !resetStateVars.minContributions) {
            alert("Set config values")
            return;
        }
        const api = getApi();
        if (!api) {
            alert("Wait for contract to load")
            return;
        }
        api.resetState({ maxValueLimit: resetStateVars.maxValueLimit, minContributions: resetStateVars.minContributions })
            .then((transactionHash) => {
                setLastHash(transactionHash);
            })
            .catch((msg) => {
                setLastError(msg.toString());
            });
    }

    const resetStateJSX = () => {
        if (!isAdmin())
            return <></>
        return (<div>
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <div>Reset Contract</div>
                <Grid container spacing={1} justifyContent="center" >
                    <Grid item xs>
                        <TextField size="small" type="number" onChange={(e) => { setResetStateVars(current => ({ ...current, minContributions: +e.target.value })) }} label="Min Contributions" />
                    </Grid>
                    <Grid item xs>
                        <TextField size="small" type="number" onChange={(e) => { setResetStateVars(current => ({ ...current, maxValueLimit: +e.target.value })) }} label="Max value limit" />
                    </Grid>
                    <Grid item xs>
                        <Button onClick={(e) => { e.preventDefault(); resetStateTxn(); }}>Submit</Button>
                    </Grid>
                </Grid>
            </Paper>
        </div>)
    }

    const updateAdminTxn = () => {
        if (!newAdmin || newAdmin === "") {
            alert("Set admin value")
            return;
        }
        const api = getApi();
        if (!api) {
            alert("Wait for contract to load")
            return;
        }
        api.setNewAdmin(newAdmin)
            .then((transactionHash) => {
                setLastHash(transactionHash);
                setLastError("");
            })
            .catch((msg) => {
                setLastHash("")
                setLastError(msg.toString());
            });
    }

    const setNewAdminJSX = () => {
        if (!isAdmin())
            return <></>
        return (
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <TextField size="small" label="Change Admin" onChange={(e) => { setNewAdmin(e.target.value) }} />
                <Button onClick={(e) => { e.preventDefault(); updateAdminTxn(); }}>Update Admin</Button>
            </Paper>
        )
    }

    const txnDetailsJSX = () => {
        return (
            <div>
                {lastHash && <div>Hash : <a href={process.env.REACT_APP_TRANSACTION_TEMPLATE! + lastHash} target="blank">{lastHash}</a></div>}
                {lastError && <div>Error : {lastError} </div>}
            </div>
        )
    }

    const nextValuesJSX = () => {
        return (
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <label>Random Values</label>
                <Box
                    sx={{ width: '100%', height: 400, bgcolor: 'background.paper' }}
                >
                    <List >
                        {contractState ? [...contractState?.nextValue].reverse().map((m, index) => {
                            return (

                                <ListItem  key={index} sx={{width:'100%'}} divider={true}>
                                <Stack direction={"row"} sx={{ padding:0.5, }} spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                                    
                                        <RngValueItem>Id: {m.calculateTimestamp.toString(10)}</RngValueItem>
                                    
                                        <RngValueItem>Values: {m.values.map(m2 => m2.toString(10)).join(" ,")}</RngValueItem>
                                    
                                        <RngValueItem >Proof: {wrapText(m.proof, 10)} <Button onClick={(e) => { e.preventDefault(); if (m.proof) navigator.clipboard.writeText(m.proof) }}><ContentPasteIcon /></Button></RngValueItem>
                                        
                                    

                                </Stack>
                                 
                                </ListItem>

                            )
                        }) : []}
                    </List>
                </Box>
            </Paper>
        )

    }
    return (
        <>
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
            <label>Contract address: {props.contractAddress}<Button onClick={(e) => { e.preventDefault(); updateContract(); }}>Refresh</Button></label>
            </Paper>
            {initContributionsJSX()}
            {resetStateJSX()}
            {setNewAdminJSX()}
            {getNextValueJSX()}
            {nextValuesJSX()}
            {txnDetailsJSX()}
        </>)
}

export default Rng;