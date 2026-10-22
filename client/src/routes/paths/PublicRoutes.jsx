import BaseLayout from "@components/layouts/base";
import PublicGuard from "@routes/PublicGuard";
import Login from "@pages/auth/Login";
import Signup from "@pages/auth/Signup";
import Callback from "@pages/auth/Callback";

const PublicRoutes = {
  element: (
    <PublicGuard>
      <BaseLayout />
    </PublicGuard>
  ),
  children: [
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "login",
      element: <Login />,
    },
    {
      path: "signup",
      element: (
        <PublicGuard>
          <Signup />
        </PublicGuard>
      ),
    },
    {
      path: "callback",
      element: <Callback />,
    },
  ],
};

export default PublicRoutes;

