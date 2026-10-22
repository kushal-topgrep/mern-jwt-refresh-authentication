import { useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LoadingButton from "@mui/lab/LoadingButton";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { IconLockOpen } from "@tabler/icons";
import { catchError } from "@utils/catchError";
import useAuth from "hooks/useAuth";
import usePageTitle from "hooks/usePageTitle";
import { Controller, useForm } from "react-hook-form";
import { Link as RouteLink } from "react-router-dom";
import { redirectToQuant0Login, QUANT0_ENABLED } from "@utils/quant0";

const schema = z.object({
  userName: z
    .string()
    .trim()
    .min(5, "Username minimum 5 characters")
    .max(20, "Username maximum 20 characters"),
  password: z
    .string()
    .trim()
    .min(6, "Password should be minimum of 6 characters")
    .max(40, "Must be 40 or fewer characters long"),
});

const defaultValues = {
  userName: "",
  password: "",
};

export default function SignIn() {
  usePageTitle("Login");
  const [toggleShowPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  //toggle show password
  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  // on Submit
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      await login(data.userName, data.password);
    } catch (error) {
      setError(catchError(error));
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <IconLockOpen />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mt: 1, mb: 2 }}>
            Login
          </Typography>

          {/* Quant0 SSO Button */}
          {QUANT0_ENABLED && (
            <Box sx={{ width: "100%", mb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => redirectToQuant0Login()}
                sx={{
                  py: 1.5,
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#1e293b",
                  },
                }}
              >
                Sign In with Quant0
              </Button>

              <Divider sx={{ my: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  OR USE LOCAL CREDENTIALS
                </Typography>
              </Divider>
            </Box>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
            <Controller
              control={control}
              name="userName"
              render={({ field }) => (
                <TextField
                  autoFocus
                  fullWidth
                  margin="normal"
                  {...field}
                  label="Username"
                  error={!!errors.userName}
                  helperText={errors?.userName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <TextField
                  fullWidth
                  margin="normal"
                  {...field}
                  label="Password"
                  type={toggleShowPassword ? "text" : "password"}
                  error={!!errors.password}
                  helperText={errors?.password?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {!toggleShowPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {error && (
              <FormHelperText error sx={{ fontSize: "1rem" }}>
                {error}
              </FormHelperText>
            )}

            <Box sx={{ mt: 3, mb: 2 }}>
              {loading ? (
                <LoadingButton loading fullWidth variant="contained">
                  Login
                </LoadingButton>
              ) : (
                <Button fullWidth type="submit" variant="contained">
                  Login
                </Button>
              )}
            </Box>
          </form>

          <Link component="p" variant="body2">
            <RouteLink to="/signup">
              Don't have an account? Create account
            </RouteLink>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}
