import { useState } from "react";
import { Link, useNavigate} from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { inputHelper} from "../helpers";
import { useRegisterUserMutation } from "../apis/authApi";
import { apiResponse } from "../interfaces";
import { toast } from '@/hooks/use-toast';

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
    const response: apiResponse = await registerUser({
      userName: userInput.userName,
      password: userInput.password,
    });
    if (response.data) {
      toast({description: "Registeration successful! Please login to continue."});
      navigate("/login");
    } else if (response.error) {
      setError(response.error.data.errorMessages[0]);
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
            <input
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
            <input
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
            <Button variant="link" style={{ width: "45%" }}>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="link" style={{ width: "45%" }}>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
export default Register;

