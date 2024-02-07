import { Box, Button, Divider, Grid, List, ListItem, Paper, Stack, TextField } from "@mui/material";
import { useState } from "react";
import CancelIcon from '@mui/icons-material/Cancel';
import PostAddIcon from '@mui/icons-material/PostAdd';
import { wrapText } from "../../utils/utils";

interface ItemFunction {
    func: (val: string, index: number) => void,
    getTitle: (index: number)=>string,
    visible: (index: number) => boolean,
    enabled: (index: number) => boolean,
}

interface Props {
    data: string[],
    title: string,
    editable: boolean,
    updateData: (data: string[]) => void,
    itemFunc: ItemFunction[],
}
const UserList = (props: Props) => {
    const [currentValue, setCurrentValue] = useState<string>("");

    const addData = () => {
        if (currentValue && currentValue.length > 0 && props.data.filter(m => m === currentValue).length === 0) {
            //props.data.push(currentValue);
            props.updateData([...props.data, currentValue]);
        }


    }

    const removeData = (val: string) => {
        const index = props.data.indexOf(val);
        if (index > -1) {
            props.data.splice(index, 1)
        }
        props.updateData([...props.data]);
    }
    return (
        <Paper variant="outlined" square={false} className="padding5 textAlignLeft">
            <div>{props.title} List</div>
            <Box
                sx={{ width: '100%', height: 400, bgcolor: 'background.paper' }}
            >
                <List sx={{ height: '95%', overflowY: 'auto' }} >
                    {props.data.map((m, index) => {
                        return (

                            <ListItem key={m.toLowerCase()}  >
                                <Grid key={index} direction={"row"} sx={{ padding: 0.5, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', width: '100%', textAlign: 'left' }}
                                    spacing={1} container justifyContent={"center"}>
                                    <Grid item sx={{ width: 40 }} justifyContent={"center"} textAlign={"center"}>
                                        <span>{index}</span>
                                    </Grid>
                                    <Divider flexItem orientation="vertical" />
                                    <Grid item xs justifyContent={"center"}>
                                        <span title={m.toLowerCase()}>{wrapText(m.toLowerCase(), 10)}</span>
                                    </Grid>
                                    {props.editable &&
                                    (<>
                                    <Divider flexItem orientation="vertical" />
                                    <Grid item sx={{ width: 80 }} justifyContent={"center"}>
                                         (<Button onClick={(e) => { e.preventDefault(); removeData(m) }}><CancelIcon /></Button>)
                                    </Grid>
                                    </>
                                    )}
                                    <Divider flexItem orientation="vertical" />
                                    {props.itemFunc.length > 0 &&
                                        props.itemFunc.map((fn) => {
                                            return <span key={fn.getTitle(index)+"_"+index} >
                                                {fn.visible(index) &&
                                                    <Grid item sx={{ width: 100 }} justifyContent={"center"} textAlign={"center"}><Button disabled={fn.enabled(index) ? false : true}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            fn.func(m, index);
                                                        }}>{fn.getTitle(index)}</Button>
                                                    </Grid>
                                                }
                                            </span>
                                        })}

                                </Grid>

                            </ListItem>


                        )
                    })}
                </List>

            </Box>
            {props.editable &&
                <Box
                    sx={{ width: '100%', bgcolor: 'background.paper', flexDirection: 'row', display: 'flex' }} key="edit_field">
                    <TextField sx={{ flexGrow: 1 }} size="small" label="Address" onChange={(e) => setCurrentValue(e.target.value)} />
                    <Button onClick={(e) => { e.preventDefault(); addData() }} title={"Add to " + props.title}><PostAddIcon /> </Button>
                </Box>
            }
        </Paper>
    )
}

export default UserList;