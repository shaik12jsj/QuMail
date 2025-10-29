import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';

export default function DraftsPage() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-display text-foreground">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
              <div className="mx-auto max-w-4xl">
                <h2 className="font-headline mb-6 text-3xl font-bold text-foreground">
                  Drafts
                </h2>
                <div className="flex items-center justify-center rounded-lg border border-dashed p-12 text-center">
                  <p>You have no saved drafts.</p>
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
