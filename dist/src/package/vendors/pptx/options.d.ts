export declare const DefaultOptions: () => {
    slidesScale: string;
    slideMode: boolean;
    slideType: string;
    revealjsPath: string;
    keyBoardShortCut: boolean;
    mediaProcess: boolean;
    jsZipV2: boolean;
    themeProcess: boolean;
    incSlide: {
        width: number;
        height: number;
    };
    slideModeConfig: {
        first: number;
        nav: boolean;
        /** true,false : show or not nav buttons*/
        navTxtColor: string;
        /** color */
        keyBoardShortCut: boolean;
        /** true,false ,condition: */
        showSlideNum: boolean;
        /** true,false */
        showTotalSlideNum: boolean;
        /** true,false */
        autoSlide: boolean;
        /** false or seconds , F8 to active ,keyBoardShortCut: true */
        randomAutoSlide: boolean;
        /** true,false ,autoSlide:true */
        loop: boolean;
        /** true,false */
        background: boolean;
        /** false or color*/
        transition: string;
        /** transition type: "slid","fade","default","random" , to show transition efects :transitionTime > 0.5 */
        transitionTime: number; /** transition time between slides in seconds */
    };
    revealjsConfig: {};
};
