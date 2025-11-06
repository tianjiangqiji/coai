import { Provider } from "react-redux";
import store from "./store/index.ts";
import AppProvider from "./components/app/AppProvider.tsx";
import { AppRouter } from "./router.tsx";
import { Toaster } from "@/components/ui/sonner";
import Spinner from "@/spinner.tsx";
import ReloadPrompt from "@/components/ReloadService.tsx";

function App() {
  return (
    <Provider store={store}>
      <AppProvider>
        <Toaster />
        <Spinner />
        <ReloadPrompt />
        <AppRouter />
      </AppProvider>
    </Provider>
  );
}

export default App;
