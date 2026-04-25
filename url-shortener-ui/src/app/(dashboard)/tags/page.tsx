export default function TagsPage() {
    return (
        <div className="-mt-6 flex w-full flex-col gap-6 pb-12">
            <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Tags</h2>
            </div>
            <div
                className="bg-background border-[0.5px] border-border rounded-2xl p-6 flex flex-col items-center justify-center min-h-100 text-muted-foreground">
                <span className="material-symbols-outlined text-4xl mb-2">sell</span>
                <p>Tags Content (Mock)</p>
            </div>
        </div>
    );
}
