import { Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from "react";
import { ConnectedWallet } from "../../ConnectedWallet";
import { RngContractState, deserializeRngContractState } from "../../contract/RandomGenerated";
import { ContractContext, NextValueVars, RawZkContractData } from "./Index";
import { CLIENT } from "../../AppState";
import { BlockchainPublicKey } from "@partisiablockchain/zk-client";
import { AbiParser, ContractAbi } from "@partisiablockchain/abi-client";
import { TransactionApi } from "../../client/TransactionApi";
import { RandomApi } from "../../contract/RandomApi";
import { BN } from "bn.js";
import { Box, Button, Card, Checkbox, Divider, Grid, List, ListItem, Paper, Radio, RadioGroup, Stack, TextField, styled } from "@mui/material";
import { convertI64ToSignature, convertSignatureToi64, serializeRange, wrapText } from "../../utils/utils";
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import FormControlLabel from "@mui/material/FormControlLabel";
import { Label } from "@mui/icons-material";
import Loading from "../loading/Index";
import useLoading from "../useLoading";

interface Props {
    connectedWallet: ConnectedWallet;
    contractAddress: string | undefined,
    finalHash: string,
    // nextValueVars: NextValueVars,
    // setNextValueVars: Dispatch<SetStateAction<NextValueVars>>,
}

interface ResetStateValue {
    maxValueLimit: number,
    minContributions: number,
}

const defaultResetStateVars = () => {
    return { minContributions: 2, maxValueLimit: 10 } as ResetStateValue;
}


const INIT_CONTRIBUTION_META = '\x00';

const RngValueItem = styled(Box)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'flex-start'
}));

const Rng = (props: Props) => {
    //Init contributions
    //Gen next value
    //Reset State
    //Set new admin
    const [lastHash, setLastHash] = useState<string | undefined>();
    const [lastError, setLastError] = useState<string | undefined>();
    // const [contractState, setContractState] = useState<RngContractState | undefined>();
    const [engineKeys, setEngineKeys] = useState<BlockchainPublicKey[] | undefined>();
    const [contractAbi, setContractAbi] = useState<ContractAbi | undefined>();
    const [zkVars, setZKVars] = useState<{ key: number, value: any }[]>([]);
    const [resetStateVars, setResetStateVars] = useState<ResetStateValue>(defaultResetStateVars());
    const [newAdmin, setNewAdmin] = useState<string | undefined>();
    const [initContribution, setInitContribution] = useState<string | undefined>();
    const { nextValueVars, setNextValueVars, useRaffle, setUseRaffle, walletLimit, setPbcContractState, pbcContractState,
        setSelectedRngIndex } = useContext(ContractContext);
    const {loading,setLoading}=useLoading();

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

                // setContractState(contractState)
                setPbcContractState(contractState)
                console.log("state", contractState);
                setLoading(false);
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
        return pbcContractState?.administrator?.asString() === props.connectedWallet.address;
    }

    const zkSubmitCount = (val: string): number => {
        if (zkVars && pbcContractState) {
            return zkVars.filter(m => { return atob(m.value.information.data) === val }).length;
        }
        return 0;
    }

    const isInitDone = (): boolean => {
        return (pbcContractState &&
            zkSubmitCount(INIT_CONTRIBUTION_META) >= pbcContractState.minSetupContributions) ?? false;
    }

    const contributionsJSX = () => {
        return <div>Contributions done: {zkSubmitCount(INIT_CONTRIBUTION_META)} / {pbcContractState?.minSetupContributions}</div>
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
        setLoading(true);
        api.addInitContribution(new BN(initContribution))
            .then((transactionHash) => {
                setInitContribution(undefined);
                setLastHash(transactionHash);
                setLastError("");
                setLoading(false);
            })
            .catch((msg) => {
                setLoading(false);
                setLastHash("");
                setLastError(msg.toString());
            });
    }

    const initContributionsJSX = () => {
        if (isInitDone())
            return <Paper variant="outlined" square={false} className="padding5 textAlignLeft">No more contributions required</Paper>
        return (
            <div><Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <div>Initial Contribution</div>
                <Grid container spacing={1} justifyContent="center" >
                    <Grid item sx={{ flexGrow: 1 }}>
                        <TextField type="number" sx={{ width: '100%' }} onChange={(e) => {
                            if (checkIsContributionValid(e.target.value)) {
                                setInitContribution(e.target.value)
                            }
                        }} size="small" label="Contribution" />
                    </Grid>
                    <Grid item xs>
                        <Button onClick={(e) => { e.preventDefault(); submitInitContribution(); }}>Submit Contribution</Button>
                    </Grid>
                </Grid>
            </Paper>
            </div>
        )
    }

    const submitNextValueTxn = () => {
        //const nextValueVars=nextValueVars;
        if (!nextValueVars || nextValueVars.count === 0 || !nextValueVars.rangeEnd
            || !nextValueVars.rangeStart
            || nextValueVars.rangeEnd === "0" || new BN(nextValueVars.rangeStart) > new BN(nextValueVars.rangeEnd)) {
            alert("Set next value vars")
            return;
        }
        const api = getApi();
        if (!api) {
            alert("Wait for contract to load")
            return;
        }
        const range = serializeRange({ start: new BN(nextValueVars.rangeStart), end: new BN(nextValueVars.rangeEnd) });
        const sigs = props.finalHash !== "" ? convertSignatureToi64(props.finalHash) : [...Array(4).keys()].map(m => "" + m)
        console.log("sigs", sigs);
        const sigsBN = sigs.map(m => new BN(m));
        setLoading(true);
        api.getNextValues({
            count: nextValueVars.count, rangeSerialized: new BN(range),
            sig0: sigsBN[0],
            sig1: sigsBN[1],
            sig2: sigsBN[2],
            sig3: sigsBN[3],
        })
            .then((transactionHash) => {
                setLastHash(transactionHash);
                setLastError("");
                setLoading(false);
            })  
            .catch((msg) => {
                setLastHash("")
                setLastError(msg.toString());
                setLoading(false);
            });
    }


    const handleCheckBoxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUseRaffle(event.target.checked);
    };

    const handleRngSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = +(event.target as HTMLInputElement).value;
        console.log("handleRngSelect", val);
        setSelectedRngIndex(val);
    };
    useEffect(() => {
        if (useRaffle) {
            setNextValueVars(current => ({ ...current, rangeStart: walletLimit.rangeStart, rangeEnd: walletLimit.rangeEnd }))
        }
    }, [useRaffle])

    const getNextValueJSX = () => {
        if (!isInitDone())
            return <div>Wait for init computation to finish. {contributionsJSX()}</div>
        return (
            <div>
                <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                    <div>Generate Next Value</div>
                    <Grid container spacing={1} justifyContent="center" >
                        <Grid item xs>
                            <TextField defaultValue={nextValueVars?.count} size="small" type="number" onChange={(e) => { setNextValueVars(current => ({ ...current, count: +e.target.value })) }} label="Count" key={nextValueVars?.rangeStart ? 'countNotLoaded' : 'countLoaded'} />
                        </Grid>
                        <Grid item xs>
                            <TextField value={nextValueVars?.rangeStart} aria-readonly={useRaffle ? true : false} inputProps={{ readOnly: useRaffle ? true : false }} size="small" type="number" onChange={(e) => { setNextValueVars(current => ({ ...current, rangeStart: e.target.value })) }} label="Range Start" key={nextValueVars?.rangeStart ? 'startNotLoaded' : 'startLoaded'} />
                        </Grid>
                        <Grid item xs>
                            <TextField value={nextValueVars?.rangeEnd} inputProps={{ readOnly: useRaffle ? true : false }} aria-readonly={useRaffle ? true : false} size="small" type="number" onChange={(e) => { setNextValueVars(current => ({ ...current, rangeEnd: e.target.value })) }} label="Range End" key={nextValueVars?.rangeEnd ? 'endNotLoaded' : 'endLoaded'} />
                        </Grid>
                        <Grid item xs>
                            <Grid container direction={"column"}>
                                <Grid item xs>
                                    <FormControlLabel control={<Checkbox checked={useRaffle} onChange={handleCheckBoxChange} />}
                                        label="Use Raffle"
                                    />
                                </Grid>
                                <Grid item xs>
                                    <Button onClick={(e) => { e.preventDefault(); submitNextValueTxn(); }}>Submit Txn</Button>
                                </Grid>
                            </Grid>

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
        setLoading(true);
        api.resetState({ maxValueLimit: resetStateVars.maxValueLimit, minContributions: resetStateVars.minContributions })
            .then((transactionHash) => {
                setLastHash(transactionHash);
                setLastError("");
                setResetStateVars({ maxValueLimit: 1, minContributions: 10 });
                setLoading(false);
            })
            .catch((msg) => {
                setLastHash("");
                setLastError(msg.toString());
                setLoading(false);
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
        setLoading(true);
        api.setNewAdmin(newAdmin)
            .then((transactionHash) => {
                setLastHash(transactionHash);
                setLastError("");
                setNewAdmin(undefined);
                setLoading(false);
            })
            .catch((msg) => {
                setLastHash("")
                setLastError(msg.toString());
                setLoading(false);
            });
    }

    const setNewAdminJSX = () => {
        if (!isAdmin())
            return <></>
        return (
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <Grid container spacing={1} justifyContent="center" direction={"row"}>
                    <Grid item sx={{ flexGrow: 1 }}>
                        <TextField size="small" sx={{ width: '100%' }} label="Change Admin" onChange={(e) => { setNewAdmin(e.target.value) }} />
                    </Grid>
                    <Grid item xs>
                        <Button onClick={(e) => { e.preventDefault(); updateAdminTxn(); }}>Update Admin</Button>
                    </Grid>
                </Grid>
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

    const addQuotesToProof = (val: string) => {
        return "[" + val.substring(1, val.length - 1).split(",").map(m => '"' + m + '"').join(",") + "]"
    }

    const nextValuesJSX = () => {
        return (
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <label>Random Values</label>
                <Box
                    sx={{ width: '100%', height: 400, bgcolor: 'background.paper' }}
                >
                    <RadioGroup
                        aria-labelledby="label"
                        name="radio-buttons-group"
                        onChange={(e) => { handleRngSelect(e) }}
                    >
                        <List >
                            {pbcContractState ? [...pbcContractState?.nextValue].reverse().map((m, index) => {
                                return (

                                    <ListItem key={index} sx={{ width: '100%' }} divider={true}>
                                        <Stack direction={"row"} sx={{ padding: 0.5, }} spacing={2} divider={<Divider orientation="vertical" flexItem />}>

                                            <RngValueItem>Id: {m.calculateTimestamp.toString(10)}</RngValueItem>

                                            <RngValueItem>Values: {m.values.map(m2 => m2.toString(10)).join(" ,")}</RngValueItem>

                                            <RngValueItem >Proof: {wrapText(m.proof, 10)} <Button onClick={(e) => {
                                                e.preventDefault(); if (m.proof) navigator.clipboard.writeText(
                                                    addQuotesToProof(m.proof))
                                            }}><ContentPasteIcon /></Button></RngValueItem>
                                            <RngValueItem>
                                                <FormControlLabel control={<Radio value={pbcContractState?.nextValue.length - index - 1} />}
                                                    label="Select"
                                                />
                                            </RngValueItem>


                                        </Stack>

                                    </ListItem>

                                )
                            }) : []}
                        </List>
                    </RadioGroup>
                </Box>
            </Paper>
        )

    }
    return (
        <>
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
            <Grid container>
                <Grid item sx={{ flexGrow: 1 }}>
                    <div style={{width:'100%'}}>Random Beacon</div>
                </Grid>
                <Grid item sx={{width:'32px'}}>
                    {loading && <Loading />}
                </Grid>
            </Grid>

        </Paper>
            <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
                <label>Contract address:  <a href={process.env.REACT_APP_CONTRACT_TEMPLATE! + props.contractAddress} target="_blank">{props.contractAddress}</a><Button onClick={(e) => { e.preventDefault(); updateContract(); }}>Refresh</Button></label>
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