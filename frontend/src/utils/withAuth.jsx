import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const navigate = useNavigate();
        const authed = !!localStorage.getItem("token");

        useEffect(() => {
            if (!authed) navigate("/auth");
        }, [authed, navigate]);

        return authed ? <WrappedComponent {...props} /> : null;
    };
    return AuthComponent;
};

export default withAuth;