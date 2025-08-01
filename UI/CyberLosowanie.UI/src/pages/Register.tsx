import { useState } from "react";
import { useNavigate} from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inputHelper} from "../helpers";
import { useRegisterUserMutation } from "../apis/authApi";
import { toast } from '@/hooks/use-toast';
import React from "react";

function Register() {
  const [error, setError] = useState("");
  const [registerUser] = useRegisterUserMutation();
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState({
    userName: "",
    password: "",
  });

  const handleUserInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const tempData = inputHelper(e, userInput);
    setUserInput(tempData);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    
    try {
      const response = await registerUser({
        userName: userInput.userName,
        password: userInput.password,
      });
      
      // Handle successful response
      if (response.data && response.data.isSuccess) {
        toast({description: "Registration successful! Please login to continue."});
        navigate("/login");
      } else if (response.data && response.data.isSuccess === false) {
        // Handle API error response (when isSuccess is false)
        const errorMessage = response.data.errors?.[0] || response.data.message || "Registration failed. Please try again.";
        setError(errorMessage);
      } else if (response.error) {
        // Handle network or other errors (HTTP errors, network issues, etc.)
        let errorMessage = "Registration failed. Please try again.";
        
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
      console.error("Registration error:", error);
      setError("An error occurred during registration. Please try again.");
    }
  };

  return (
    <section className="h-screen grid place-items-center bg-gradient-to-t from-green-900 via-green-700 to-green-500 min-h-screen w-full">
      <Card className="w-96 bg-muted flex flex-col items-center">
        <CardHeader>
          <CardTitle className="text-center">Register</CardTitle>
        </CardHeader>
        <CardContent className="w-full flex flex-col items-center">
        <form method="post" onSubmit={handleSubmit} className="w-3/5 flex flex-col items-center">
        <div>
          <div className="w-full mt-4">
            <Input
              type="text"
              className="form-control w-full"
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
              className="form-control w-full"
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
            Register
          </Button>
        </div>
      </form>
          <div className="mt-4 w-full flex justify-between">
            <Button variant="link" style={{ width: "45%" }} onClick={() => navigate("/")}>
              Home
            </Button>
            <Button variant="link" style={{ width: "45%" }} onClick={() => navigate("/login")}>
              Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
export default Register;

