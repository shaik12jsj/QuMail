import { AppHeader } from '@/components/app-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Download } from 'lucide-react';

export default function BillingPage() {
  const invoices = [
    { id: 'INV-005', date: 'May 20, 2024', amount: '$25.00', status: 'Paid' },
    { id: 'INV-004', date: 'April 20, 2024', amount: '$25.00', status: 'Paid' },
    { id: 'INV-003', date: 'March 20, 2024', amount: '$25.00', status: 'Paid' },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-display text-foreground">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
              <div className="mx-auto max-w-4xl space-y-8">
                <div>
                  <h2 className="font-headline mb-2 text-3xl font-bold text-foreground">
                    Billing
                  </h2>
                  <p className="text-muted-foreground">Manage your billing information and view your invoices.</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>You are currently on the Professional plan.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-4">
                      <span className="text-4xl font-bold">$25</span>
                      <span className="text-muted-foreground">/ month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your plan includes unlimited secure emails, 10GB of storage, and priority support.
                    </p>
                  </CardContent>
                  <CardFooter className="border-t pt-6">
                    <Button>Upgrade Plan</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Your primary payment method.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 rounded-lg border bg-secondary p-4">
                      <CreditCard className="h-8 w-8" />
                      <div>
                        <p className="font-semibold">Visa ending in 1234</p>
                        <p className="text-sm text-muted-foreground">Expires 12/2028</p>
                      </div>
                      <Button variant="outline" size="sm" className="ml-auto">
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View and download your past invoices.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.id}</TableCell>
                            <TableCell>{invoice.date}</TableCell>
                            <TableCell>{invoice.amount}</TableCell>
                            <TableCell>
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-400">
                                {invoice.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
