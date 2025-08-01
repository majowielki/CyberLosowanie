import { useState } from "react";
import { useLoginUserMutation } from "../apis/authApi";
import { inputHelper } from "../helpers";
import { userModel } from "../interfaces";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { setLoggedInUser } from "../features/redux/userSlice";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React from "react";

function Login() {

  const [error, setError] = useState("");
  const [loginUser] = useLoginUserMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState({
    userName: "",
    password: "",
  });

  const handleUserInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tempData = inputHelper(e, userInput);
    setUserInput(tempData);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    
    try {
      const response = await loginUser({
        userName: userInput.userName,
        password: userInput.password,
      });
      
      // Handle successful response
      if (response.data && response.data.isSuccess && response.data.data) {
        const token = response.data.data.token;
        
        if (token) {
          // Store token first
          localStorage.setItem("token", token);
          
          // Then decode and update Redux state
          const decoded = jwtDecode<userModel>(token);
          const userData: userModel = {
            fullName: decoded.fullName || '',
            id: decoded.id || '',
            cyberekId: decoded.cyberekId || '0',
            giftedCyberekId: decoded.giftedCyberekId || '0'
          };
          
          dispatch(setLoggedInUser(userData));
          navigate("/");
        } else {
          setError("Token not found in response. Please try again.");
        }
      } else if (response.data && response.data.isSuccess === false) {
        // Handle API error response (when isSuccess is false)
        const errorMessage = response.data.errors?.[0] || response.data.message || "Login failed. Please try again.";
        setError(errorMessage);
      } else if (response.error) {
        // Handle network or other errors (HTTP errors, network issues, etc.)
        let errorMessage = "Login failed. Please try again.";
        
        // Handle FetchBaseQueryError (has status and data)
        if ('status' in response.error && response.error.data) {
          const errorData = response.error.data as {errors?: string[]; message?: string};
          errorMessage = errorData?.errors?.[0] || errorData?.message || errorMessage;
        }
        // Handle SerializedError (has message)
        else if ('message' in response.error && response.error.message) {
          errorMessage = response.error.message;
        }
        
        setError(errorMessage);
      } else {
        setError("Unexpected response format. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
    }
  };

  return (
    <section className="h-screen grid place-items-center bg-gradient-to-t from-green-900 via-green-700 to-green-500 min-h-screen w-full">
      <Card className="w-96 bg-muted flex flex-col items-center">
        <CardHeader>
          <CardTitle className="text-center">Login</CardTitle>
        </CardHeader>
        <CardContent className="w-full flex flex-col items-center">
          <form method="post" onSubmit={handleSubmit} className="w-3/5 flex flex-col items-center">
            <div>
              <div className="w-full mt-4">
                <Input
                  type="text"
                  className="w-full"
                  placeholder="Enter Username"
                  required
                  name="userName"
                  value={userInput.userName}
                  onChange={handleUserInput}
                />
              </div>
              <div className="w-full mt-4">
                <Input
                  type="password"
                  className="w-full"
                  placeholder="Enter Password"
                  required
                  name="password"
                  value={userInput.password}
                  onChange={handleUserInput}
                />
              </div>
            </div>
            <div className="mt-2 w-full flex flex-col items-center">
              {error && <p className="text-danger">{error}</p>}
              <Button className="mt-5" style={{ width: "200px" }}>
                Login
              </Button>
            </div>
          </form>
          <div className="mt-4 w-full flex justify-between">
            <Button variant="link" style={{ width: "45%" }} onClick={() => navigate("/")}>
              Home
            </Button>
            <Button variant="link" style={{ width: "45%" }} onClick={() => navigate("/register")}>
              Register
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
export default Login;