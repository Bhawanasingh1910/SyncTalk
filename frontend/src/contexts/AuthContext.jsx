import axios from "axios";
import { createContext } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    const handleRegister = async (name, username, password) => {
        const res = await client.post("/register", { name, username, password });
        if (res.status === 201) return res.data.message;
    };

    const handleLogin = async (username, password) => {
        const res = await client.post("/login", { username, password });
        if (res.status === 200) {
            localStorage.setItem("token", res.data.token);
            navigate("/home");
        }
    };

    const getHistoryOfUser = async () => {
        const res = await client.get("/get_all_activity", {
            params: { token: localStorage.getItem("token") }
        });
        return res.data;
    };

    const addToUserHistory = async (meetingCode) => {
        return client.post("/add_to_activity", {
            token: localStorage.getItem("token"),
            meeting_code: meetingCode
        });
    };

    return (
        <AuthContext.Provider value={{ addToUserHistory, getHistoryOfUser, handleRegister, handleLogin }}>
            {children}
        </AuthContext.Provider>
    );
};