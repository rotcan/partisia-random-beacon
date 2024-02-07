import { createContext, useState,Dispatch,SetStateAction, useContext } from "react";

type LoadingContextType={
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>
}
const LoadingContext=createContext({
    loading:false,
    setLoading: ()=>{},
} as LoadingContextType);

interface Props {
    children: React.ReactNode;
}

export const LoadingProvider: React.FC<Props>=({children})=>{
    const [loading,setLoading]=useState<boolean>(false);
    const value={loading,setLoading};
    return (
        <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
    )
}

const useLoading=()=>{
    const context=useContext(LoadingContext);
    if(!context){
        throw new Error("useLoading must be used within loading provider");
    }
    return context;
}

export default useLoading;