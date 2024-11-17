import { useState } from "react";
import { useLoginUserMutation } from "../apis/authApi";
import { inputHelper } from "../helpers";
import { apiResponse, userModel } from "../interfaces";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { setLoggedInUser } from "../features/redux/userSlice";
import { Button } from '@/components/ui/button';
import { Link } from "react-router-dom";

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
    const response: apiResponse = await loginUser({
      userName: userInput.userName,
      password: userInput.password,
    });
    if (response.data) {
      const { token } = response.data.result;
      const { fullName, id, cyberekId, giftedCyberekId}: userModel = jwtDecode(token);
      localStorage.setItem("token", token);
      dispatch(setLoggedInUser({ fullName, id, cyberekId, giftedCyberekId }));
      navigate("/");
    } else if (response.error) {
      setError(response.error.data.errorMessages[0]);
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
                Login
              </Button>
            </div>
          </form>
          <div className="mt-4 w-full flex justify-between">
            <Button variant="link" style={{ width: "45%" }}>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="link" style={{ width: "45%" }}>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
export default Login;