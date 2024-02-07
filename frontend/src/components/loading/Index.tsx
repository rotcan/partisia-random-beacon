import useLoading from "../useLoading";
import "./loading.css";

const Loading = () => {
  const { loading } = useLoading();

  return (
    <>
      {loading && (
        <>
          <div className="spinner-container">
            <div className="loading-spinner"></div>
          </div>
        </>
      )}
    </>
  );
};

export default Loading;