import { useEffect } from "react";
import { StorybookWizard } from "@/components/storybook/StorybookWizard";

export default function CreateStorybook() {
  // Always start fresh when navigating to this page
  useEffect(() => {
    sessionStorage.removeItem("storybook-wizard-data");
  }, []);

  return <StorybookWizard />;
}
