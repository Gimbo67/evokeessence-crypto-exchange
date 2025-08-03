import { DepositTestView } from "@/components/test/DepositTestView";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function DepositTestPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <Helmet>
        <title>Deposit Test | EvokeEssence</title>
      </Helmet>

      <Card>
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-2xl">Deposit Flow Test</CardTitle>
          <CardDescription>
            Test the end-to-end deposit flow, commission handling, and exchange rate consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 space-y-4">
            <h2 className="text-xl font-semibold">Test Instructions</h2>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="font-medium">Method 1: Automated Test</p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>Run the test script from the terminal: <code className="bg-muted px-2 py-0.5 rounded">bash server/scripts/run-deposit-test.sh</code></li>
                <li>The script will create a test deposit and simulate admin approval</li>
                <li>Review the console output to verify commission and balance calculations</li>
                <li>Come back to this page to see the results reflected in the UI</li>
              </ol>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="font-medium">Method 2: Manual Test</p>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>Log in as a regular user (e.g., test3)</li>
                <li>Navigate to the Deposit page and create a new SEPA deposit of 1000 EUR</li>
                <li>Note the commission calculation (should be 160 EUR)</li>
                <li>Complete the deposit process</li>
                <li>Log in as an admin user</li>
                <li>Navigate to Admin Dashboard → Clients</li>
                <li>Find the client's new pending deposit</li>
                <li>Change the deposit status to "successful"</li>
                <li>Verify the client's balance increased by 840 EUR (amount after commission)</li>
                <li>Verify exchange rate consistency between admin and client views</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <Button onClick={() => setLocation("/dashboard")}>
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => setLocation("/deposit")}>
              Go to Deposit Page
            </Button>
          </div>

          <DepositTestView />
        </CardContent>
      </Card>
    </div>
  );
}
