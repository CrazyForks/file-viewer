import { Ref } from 'vue';
type ScrollerGetter = () => HTMLElement | null;
export declare const useSynchronizedScroll: (enabled: Ref<boolean>, getLeftScroller: ScrollerGetter, getRightScroller: ScrollerGetter) => {
    bind: () => Promise<void>;
    destroy: () => void;
};
export {};
