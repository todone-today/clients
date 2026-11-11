// next/navigation outside Next.js: a router that goes nowhere.
const router = { push() {}, replace() {}, back() {}, refresh() {}, prefetch() {} };
export const useRouter = () => router;
export const usePathname = () => "/app";
export const useParams = () => ({});
export const useSearchParams = () => new URLSearchParams();
export const redirect = () => {};
