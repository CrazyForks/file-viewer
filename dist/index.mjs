import { Fragment as e, computed as t, createCommentVNode as n, createElementBlock as r, createElementVNode as i, createVNode as a, defineComponent as o, h as s, inject as c, nextTick as l, normalizeClass as u, normalizeStyle as d, onBeforeUnmount as f, openBlock as p, reactive as m, ref as h, renderList as g, shallowRef as _, toDisplayString as v, toValue as y, unref as b, watch as x } from "vue";
import { DEFAULT_FILE_VIEWER_SOURCE_FILENAME as S, DEFAULT_RENDERER_DEFINITIONS as C, applyFileViewerZoomState as w, collectFileViewerRendererPlugins as T, coreBrowserRendererHandlers as E, createEmptyFileViewerSearchState as D, createFileRenderHandlerLoader as O, createFileRenderHandlerRegistry as ee, createFileRenderHandlerRendererSession as te, createFileViewerCoreRendererRegistry as ne, createFileViewerDocumentFeatureControllerActionHandlers as re, createFileViewerErrorState as ie, createFileViewerFitController as ae, createFileViewerLifecycleFacade as oe, createFileViewerLoadingController as se, createFileViewerLoadingControllerActionHandlers as ce, createFileViewerPreviewStateTarget as le, createFileViewerPublicApi as ue, createFileViewerPublicOperationActionHandlers as de, createFileViewerRenderReadinessTarget as fe, createFileViewerRenderSurfaceActionHandlers as pe, createFileViewerRenderSurfaceStateTarget as me, createFileViewerRendererDispatcher as k, createFileViewerRequestScope as he, createFileViewerSourceLoadingActionHandlers as A, createFileViewerToolbarControllerActionHandlers as ge, createFileViewerTranslator as _e, createFileViewerUnsupportedState as j, createFileViewerViewStateController as ve, createFileViewerViewStateControllerActionHandlers as ye, createFileViewerZoomController as be, createFileViewerZoomControllerActionHandlers as xe, createFileViewerZoomState as M, createRendererRegistry as Se, createViewer as N, formatFileViewerErrorMessage as Ce, getExtension as P, hasFileViewerExplicitInitialViewState as we, installFileViewerRendererPlugins as Te, listFileViewerAutoRendererPresets as Ee, normalizeFilename as De, normalizeSource as Oe, readFileViewerBuffer as ke, renderFileViewerHandler as Ae, reportFileViewerLifecycleHookError as je, reportFileViewerOperationError as Me, resolveFileViewerPresentationState as Ne, resolveFileViewerRendererPresetInputs as Pe, resolveFileViewerSourceFilename as Fe, resolveFileViewerWatermarkPresentationState as Ie, runFileViewerPreviewComponentUnmount as Le, runFileViewerPreviewSourceChange as F, translateFileViewerMessage as Re, wrapFileViewerFileRef as ze } from "@file-viewer/core";
//#region src/package/style.css?url
var I = "" + "data:text/css;base64,LmZpbGUtdmlld2VyW2RhdGEtdi1iZGU1MGNjOF17LS1maWxlLXZpZXdlci10b29sYmFyLWdhcDo2cHg7LS1maWxlLXZpZXdlci10b29sYmFyLW1pbi1oZWlnaHQ6NDVweDstLWZpbGUtdmlld2VyLXRvb2xiYXItcGFkZGluZzo2cHggMTBweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctb2Zmc2V0OjE2cHg7LS1maWxlLXZpZXdlci10b29sYmFyLWZsb2F0aW5nLW1pbi1oZWlnaHQ6NDJweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctcGFkZGluZzo2cHg7LS1maWxlLXZpZXdlci10b29sYmFyLWdyb3VwLWdhcDoycHg7LS1maWxlLXZpZXdlci10b29sYmFyLWdyb3VwLXBhZGRpbmc6MnB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1idXR0b24tbWluLXdpZHRoOjQycHg7LS1maWxlLXZpZXdlci10b29sYmFyLWJ1dHRvbi1oZWlnaHQ6MzBweDstLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLXBhZGRpbmc6MCAxMHB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1idXR0b24tcmFkaXVzOjhweDstLWZpbGUtdmlld2VyLXRvb2xiYXItaWNvbi1zaXplOjMwcHg7LS1maWxlLXZpZXdlci10b29sYmFyLW1ldGVyLW1pbi13aWR0aDo0OHB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1tZXRlci1wYWRkaW5nOjAgOHB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1idXR0b24tbWluLXdpZHRoOjQ4cHg7LS1maWxlLXZpZXdlci10b29sYmFyLWZsb2F0aW5nLWJ1dHRvbi1oZWlnaHQ6MzJweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctaWNvbi1zaXplOjMycHg7LS1maWxlLXZpZXdlci10b29sYmFyLWZsb2F0aW5nLW1ldGVyLW1pbi13aWR0aDo1NHB4Oy0tbGlnaHRuaW5nY3NzLWxpZ2h0OmluaXRpYWw7LS1saWdodG5pbmdjc3MtZGFyazogO2NvbG9yLXNjaGVtZTpsaWdodDtiYWNrZ3JvdW5kOiNmZmY7ZmxleC1kaXJlY3Rpb246Y29sdW1uO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7ZGlzcGxheTpmbGV4O3Bvc2l0aW9uOnJlbGF0aXZlfS5maWxlLXZpZXdlcltkYXRhLXZpZXdlci1kZW5zaXR5PWNvbXBhY3RdW2RhdGEtdi1iZGU1MGNjOF17LS1maWxlLXZpZXdlci10b29sYmFyLWdhcDozcHg7LS1maWxlLXZpZXdlci10b29sYmFyLW1pbi1oZWlnaHQ6MzRweDstLWZpbGUtdmlld2VyLXRvb2xiYXItcGFkZGluZzozcHggNXB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1vZmZzZXQ6MTBweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctbWluLWhlaWdodDozMnB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1wYWRkaW5nOjNweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZ3JvdXAtZ2FwOjJweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZ3JvdXAtcGFkZGluZzoycHg7LS1maWxlLXZpZXdlci10b29sYmFyLWJ1dHRvbi1taW4td2lkdGg6MzRweDstLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLWhlaWdodDoyNnB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1idXR0b24tcGFkZGluZzowIDZweDstLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLXJhZGl1czo2cHg7LS1maWxlLXZpZXdlci10b29sYmFyLWljb24tc2l6ZToyNnB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1tZXRlci1taW4td2lkdGg6NDJweDstLWZpbGUtdmlld2VyLXRvb2xiYXItbWV0ZXItcGFkZGluZzowIDVweDstLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctYnV0dG9uLW1pbi13aWR0aDozOHB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1idXR0b24taGVpZ2h0OjI4cHg7LS1maWxlLXZpZXdlci10b29sYmFyLWZsb2F0aW5nLWljb24tc2l6ZToyOHB4Oy0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1tZXRlci1taW4td2lkdGg6NDZweH0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9ZGFya11bZGF0YS12LWJkZTUwY2M4XXstLWxpZ2h0bmluZ2Nzcy1saWdodDogOy0tbGlnaHRuaW5nY3NzLWRhcms6aW5pdGlhbDtjb2xvci1zY2hlbWU6ZGFyaztiYWNrZ3JvdW5kOiMwZjE3MWR9LnZpZXdlci1zdGFnZVtkYXRhLXYtYmRlNTBjYzhde2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtmbGV4OjE7bWluLWhlaWdodDowO2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW59LnZpZXdlci1hY3Rpb25zW2RhdGEtdi1iZGU1MGNjOF17anVzdGlmeS1jb250ZW50OmZsZXgtZW5kO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1nYXApO21pbi1oZWlnaHQ6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1taW4taGVpZ2h0KTtwYWRkaW5nOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItcGFkZGluZyk7YmFja2dyb3VuZDpyZ2JhKDI1NSwyNTUsMjU1LC45Mik7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgcmdiYSgyMCwzNSw1MywuMDYpO2ZsZXgtc2hyaW5rOjA7ZGlzcGxheTppbmxpbmUtZmxleH0udmlld2VyLWFjdGlvbnNbZGF0YS10b29sYmFyLXBvc2l0aW9uPXRvcC1jZW50ZXJdW2RhdGEtdi1iZGU1MGNjOF17anVzdGlmeS1jb250ZW50OmNlbnRlcn0udmlld2VyLWFjdGlvbnMtLWZsb2F0aW5nW2RhdGEtdi1iZGU1MGNjOF17ei1pbmRleDozMDtyaWdodDpjYWxjKHZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctb2Zmc2V0KSArIGVudihzYWZlLWFyZWEtaW5zZXQtcmlnaHQsMHB4KSk7Ym90dG9tOmNhbGModmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1vZmZzZXQpICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KSk7bWluLWhlaWdodDp2YXIoLS1maWxlLXZpZXdlci10b29sYmFyLWZsb2F0aW5nLW1pbi1oZWlnaHQpO3BhZGRpbmc6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1wYWRkaW5nKTstd2Via2l0LWJhY2tkcm9wLWZpbHRlcjpibHVyKDE2cHgpO2JhY2tkcm9wLWZpbHRlcjpibHVyKDE2cHgpO2JhY2tncm91bmQ6cmdiYSgyNTUsMjU1LDI1NSwuOTQpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyMCwzNSw1MywuMSk7Ym9yZGVyLXJhZGl1czo5OTlweDtwb3NpdGlvbjphYnNvbHV0ZTtib3gtc2hhZG93OjAgMThweCA0NHB4IHJnYmEoMTUsMjMsNDIsLjE2KX0udmlld2VyLWFjdGlvbnMtZ3JvdXBbZGF0YS12LWJkZTUwY2M4XXthbGlnbi1pdGVtczpjZW50ZXI7Z2FwOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItZ3JvdXAtZ2FwKTtwYWRkaW5nOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItZ3JvdXAtcGFkZGluZyk7YmFja2dyb3VuZDpyZ2JhKDIwLDM1LDUzLC4wMzUpO2JvcmRlcjoxcHggc29saWQgcmdiYSgyMCwzNSw1MywuMDgpO2JvcmRlci1yYWRpdXM6OTk5cHg7ZGlzcGxheTppbmxpbmUtZmxleH0udmlld2VyLWFjdGlvbnMgYnV0dG9uW2RhdGEtdi1iZGU1MGNjOF17bWluLXdpZHRoOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLW1pbi13aWR0aCk7aGVpZ2h0OnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLWhlaWdodCk7cGFkZGluZzp2YXIoLS1maWxlLXZpZXdlci10b29sYmFyLWJ1dHRvbi1wYWRkaW5nKTtib3JkZXItcmFkaXVzOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLXJhZGl1cyk7Y29sb3I6IzQwNTQ2YTtmb250OmluaGVyaXQ7Y3Vyc29yOnBvaW50ZXI7YmFja2dyb3VuZDowIDA7Ym9yZGVyOjA7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6ODAwfS52aWV3ZXItYWN0aW9ucyAudmlld2VyLWljb24tYnV0dG9uW2RhdGEtdi1iZGU1MGNjOF17d2lkdGg6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1pY29uLXNpemUpO21pbi13aWR0aDp2YXIoLS1maWxlLXZpZXdlci10b29sYmFyLWljb24tc2l6ZSk7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzowO2Rpc3BsYXk6aW5saW5lLWZsZXh9LnZpZXdlci1hY3Rpb25zIC52aWV3ZXItem9vbS1tZXRlcltkYXRhLXYtYmRlNTBjYzhde21pbi13aWR0aDp2YXIoLS1maWxlLXZpZXdlci10b29sYmFyLW1ldGVyLW1pbi13aWR0aCk7aGVpZ2h0OnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItYnV0dG9uLWhlaWdodCk7cGFkZGluZzp2YXIoLS1maWxlLXZpZXdlci10b29sYmFyLW1ldGVyLXBhZGRpbmcpO2JveC1zaXppbmc6Ym9yZGVyLWJveDtjb2xvcjojMjM0NjVlO2p1c3RpZnktY29udGVudDpjZW50ZXI7YWxpZ24taXRlbXM6Y2VudGVyO2Rpc3BsYXk6aW5saW5lLWZsZXh9LnZpZXdlci1hY3Rpb25zIC52aWV3ZXItem9vbS1tZXRlci0tcmVhZG9ubHlbZGF0YS12LWJkZTUwY2M4XXt3aGl0ZS1zcGFjZTpub3dyYXA7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6ODAwO2xpbmUtaGVpZ2h0OjF9LnZpZXdlci1hY3Rpb25zLS1mbG9hdGluZyBidXR0b25bZGF0YS12LWJkZTUwY2M4XXttaW4td2lkdGg6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1idXR0b24tbWluLXdpZHRoKTtoZWlnaHQ6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1idXR0b24taGVpZ2h0KTtib3JkZXItcmFkaXVzOjk5OXB4fS52aWV3ZXItYWN0aW9ucy0tZmxvYXRpbmcgLnZpZXdlci1pY29uLWJ1dHRvbltkYXRhLXYtYmRlNTBjYzhde3dpZHRoOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctaWNvbi1zaXplKTttaW4td2lkdGg6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1pY29uLXNpemUpfS52aWV3ZXItYWN0aW9ucy0tZmxvYXRpbmcgLnZpZXdlci16b29tLW1ldGVyW2RhdGEtdi1iZGU1MGNjOF17bWluLXdpZHRoOnZhcigtLWZpbGUtdmlld2VyLXRvb2xiYXItZmxvYXRpbmctbWV0ZXItbWluLXdpZHRoKTtoZWlnaHQ6dmFyKC0tZmlsZS12aWV3ZXItdG9vbGJhci1mbG9hdGluZy1idXR0b24taGVpZ2h0KX0udmlld2VyLWFjdGlvbnMgYnV0dG9uW2RhdGEtdi1iZGU1MGNjOF06aG92ZXI6bm90KDpkaXNhYmxlZCl7Y29sb3I6IzE2Nzc0YztiYWNrZ3JvdW5kOnJnYmEoMzMsMTYzLDEwMiwuMSl9LnZpZXdlci1hY3Rpb25zIGJ1dHRvbltkYXRhLXYtYmRlNTBjYzhdOmRpc2FibGVke2NvbG9yOiNhYWI1YzA7Y3Vyc29yOm5vdC1hbGxvd2VkfS52aWV3ZXItY29udGVudC1zaGVsbFtkYXRhLXYtYmRlNTBjYzhde2ZsZXg6MTttaW4taGVpZ2h0OjA7cG9zaXRpb246cmVsYXRpdmU7b3ZlcmZsb3c6aGlkZGVufS5jb250ZW50W2RhdGEtdi1iZGU1MGNjOF17YmFja2dyb3VuZDojZjJmMmYyO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7ZGlzcGxheTpibG9jaztvdmVyZmxvdzphdXRvfS5jb250ZW50LmhpZGRlbltkYXRhLXYtYmRlNTBjYzhde3Zpc2liaWxpdHk6aGlkZGVufS5mbHlmaXNoLXNlYXJjaC1tYXRjaHtjb2xvcjppbmhlcml0O2JhY2tncm91bmQ6cmdiYSgyNTUsMjE0LDEwMiwuNzIpO2JvcmRlci1yYWRpdXM6NHB4O3BhZGRpbmc6MCAycHg7Ym94LXNoYWRvdzowIDAgMCAxcHggcmdiYSgxODUsMTI4LDAsLjE0KX0uZmx5ZmlzaC1zZWFyY2gtbWF0Y2gtLWFjdGl2ZXtiYWNrZ3JvdW5kOnJnYmEoNDcsMTkxLDEyMiwuODIpO2JveC1zaGFkb3c6MCAwIDAgMnB4IHJnYmEoMzAsMTMyLDgzLC4yNCl9LnZpZXdlci13YXRlcm1hcmtbZGF0YS12LWJkZTUwY2M4XXt6LWluZGV4OjIwO3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZC1yZXBlYXQ6cmVwZWF0O3Bvc2l0aW9uOmFic29sdXRlO3RvcDowO2JvdHRvbTowO2xlZnQ6MDtyaWdodDowfS5zdGF0ZS1wYW5lbFtkYXRhLXYtYmRlNTBjYzhde3otaW5kZXg6NDA7YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQocmdiYSgyNTUsMjU1LDI1NSwuOTIpLHJnYmEoMjQ2LDI0OCwyNDksLjk4KSk7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1pdGVtczpjZW50ZXI7cGFkZGluZzoyNHB4O2Rpc3BsYXk6ZmxleDtwb3NpdGlvbjphYnNvbHV0ZTt0b3A6MDtib3R0b206MDtsZWZ0OjA7cmlnaHQ6MH0ubG9hZGluZy1jYXJkW2RhdGEtdi1iZGU1MGNjOF0sLmVycm9yLWNhcmRbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOnJnYmEoMjU1LDI1NSwyNTUsLjkyKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMTksMzYsNTUsLjA2KTtib3JkZXItcmFkaXVzOjI0cHg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDoxOHB4O3dpZHRoOm1pbigxMDAlLDQ2MHB4KTtwYWRkaW5nOjIycHg7ZGlzcGxheTpmbGV4O2JveC1zaGFkb3c6MCAxOHB4IDQycHggcmdiYSgxNSwzMSw0NywuMTIpfS5sb2FkaW5nLWljb25bZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxMzVkZWcsIHZhcigtLXZpZXdlci1hY2NlbnQpIDAlLCB2YXIoLS12aWV3ZXItYWNjZW50KSAxMDAlKTtjb2xvcjojZmZmO2xldHRlci1zcGFjaW5nOi4wNGVtO2JvcmRlci1yYWRpdXM6MjBweDtmbGV4LXNocmluazowO2p1c3RpZnktY29udGVudDpjZW50ZXI7YWxpZ24taXRlbXM6Y2VudGVyO21pbi13aWR0aDo3MHB4O2hlaWdodDo3MHB4O3BhZGRpbmc6MCAxMnB4O2ZvbnQtc2l6ZToyMnB4O2ZvbnQtd2VpZ2h0OjgwMDtkaXNwbGF5OmlubGluZS1mbGV4O2JveC1zaGFkb3c6MCAxNHB4IDMwcHggcmdiYSgxNywyOCw0MCwuMTQpfS5sb2FkaW5nLWNvcHlbZGF0YS12LWJkZTUwY2M4XXtmbGV4OjE7bWluLXdpZHRoOjB9LmxvYWRpbmcta2lja2VyW2RhdGEtdi1iZGU1MGNjOF17Y29sb3I6dmFyKC0tdmlld2VyLWFjY2VudCk7bGV0dGVyLXNwYWNpbmc6LjA4ZW07dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtkaXNwbGF5OmJsb2NrfS5sb2FkaW5nLWNvcHkgc3Ryb25nW2RhdGEtdi1iZGU1MGNjOF0sLmVycm9yLWNhcmQgc3Ryb25nW2RhdGEtdi1iZGU1MGNjOF17Y29sb3I6IzE2MjgzYjttYXJnaW4tdG9wOjRweDtmb250LXNpemU6MjBweDtsaW5lLWhlaWdodDoxLjI7ZGlzcGxheTpibG9ja30ubG9hZGluZy1jb3B5IHBbZGF0YS12LWJkZTUwY2M4XSwuZXJyb3ItY2FyZCBwW2RhdGEtdi1iZGU1MGNjOF17Y29sb3I6IzZhN2Q5MDttYXJnaW46OHB4IDAgMDtsaW5lLWhlaWdodDoxLjZ9LmxvYWRpbmctcmluZ1tkYXRhLXYtYmRlNTBjYzhde2JvcmRlcjozcHggc29saWQgdmFyKC0tdmlld2VyLXNvZnQpO2JvcmRlci10b3AtY29sb3I6dmFyKC0tdmlld2VyLWFjY2VudCk7Ym9yZGVyLXJhZGl1czo5OTlweDtmbGV4LXNocmluazowO3dpZHRoOjM4cHg7aGVpZ2h0OjM4cHg7YW5pbWF0aW9uOi45cyBsaW5lYXIgaW5maW5pdGUgdmlld2VyLXNwaW4tYmRlNTBjYzh9LmVycm9yLWNhcmRbZGF0YS12LWJkZTUwY2M4XXt0ZXh0LWFsaWduOmNlbnRlcjtkaXNwbGF5OmJsb2NrfS5lcnJvci1jYXJkIHN0cm9uZ1tkYXRhLXYtYmRlNTBjYzhde2NvbG9yOiNiNDIzMTh9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPWRhcmtdIC52aWV3ZXItYWN0aW9ucy0tZmxvYXRpbmdbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOnJnYmEoMTQsMjIsMjgsLjk0KTtib3JkZXItY29sb3I6cmdiYSgxNjcsMTg1LDE5OCwuMTYpO2JveC1zaGFkb3c6MCAyMHB4IDUycHggcmdiYSgwLDAsMCwuMzQpfS5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1kYXJrXSAudmlld2VyLWFjdGlvbnNbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOnJnYmEoMTQsMjIsMjgsLjk0KTtib3JkZXItYm90dG9tLWNvbG9yOnJnYmEoMTY3LDE4NSwxOTgsLjEyKX0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9ZGFya10gLnZpZXdlci1hY3Rpb25zIGJ1dHRvbltkYXRhLXYtYmRlNTBjYzhde2NvbG9yOiNiOGM3ZDV9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPWRhcmtdIC52aWV3ZXItYWN0aW9ucy1ncm91cFtkYXRhLXYtYmRlNTBjYzhde2JhY2tncm91bmQ6cmdiYSgxNjcsMTg1LDE5OCwuMDgpO2JvcmRlci1jb2xvcjpyZ2JhKDE2NywxODUsMTk4LC4xMyl9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPWRhcmtdIC52aWV3ZXItYWN0aW9ucyBidXR0b25bZGF0YS12LWJkZTUwY2M4XTpob3Zlcjpub3QoOmRpc2FibGVkKXtjb2xvcjojNWVlMGFlO2JhY2tncm91bmQ6cmdiYSg0NSwyMTIsMTU0LC4xNCl9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPWRhcmtdIC52aWV3ZXItYWN0aW9ucyBidXR0b25bZGF0YS12LWJkZTUwY2M4XTpkaXNhYmxlZHtjb2xvcjojNjY3ODg4fS5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1kYXJrXSAuY29udGVudFtkYXRhLXYtYmRlNTBjYzhde2JhY2tncm91bmQ6IzE0MWMyM30uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9ZGFya10gLnN0YXRlLXBhbmVsW2RhdGEtdi1iZGU1MGNjOF17YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQocmdiYSgxNSwyMywzMCwuOTIpLHJnYmEoMTEsMTcsMjIsLjk4KSl9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPWRhcmtdIC5sb2FkaW5nLWNhcmRbZGF0YS12LWJkZTUwY2M4XSwuZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9ZGFya10gLmVycm9yLWNhcmRbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOnJnYmEoMTksMjksMzcsLjk0KTtib3JkZXItY29sb3I6cmdiYSgxMzksMTYxLDE3NywuMTYpO2JveC1zaGFkb3c6MCAyMnB4IDUycHggcmdiYSgwLDAsMCwuMzQpfS5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1kYXJrXSAubG9hZGluZy1jb3B5IHN0cm9uZ1tkYXRhLXYtYmRlNTBjYzhdLC5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1kYXJrXSAuZXJyb3ItY2FyZCBzdHJvbmdbZGF0YS12LWJkZTUwY2M4XXtjb2xvcjojZWZmN2ZifS5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1kYXJrXSAubG9hZGluZy1jb3B5IHBbZGF0YS12LWJkZTUwY2M4XSwuZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9ZGFya10gLmVycm9yLWNhcmQgcFtkYXRhLXYtYmRlNTBjYzhde2NvbG9yOiM5ZWIwYmZ9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPWRhcmtdIC5lcnJvci1jYXJkIHN0cm9uZ1tkYXRhLXYtYmRlNTBjYzhde2NvbG9yOiNmZjljOTF9QGtleWZyYW1lcyB2aWV3ZXItc3Bpbi1iZGU1MGNjOHswJXt0cmFuc2Zvcm06cm90YXRlKDApfXRve3RyYW5zZm9ybTpyb3RhdGUoMzYwZGVnKX19QG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTpkYXJrKXsuZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9c3lzdGVtXVtkYXRhLXYtYmRlNTBjYzhdey0tbGlnaHRuaW5nY3NzLWxpZ2h0OiA7LS1saWdodG5pbmdjc3MtZGFyazppbml0aWFsO2NvbG9yLXNjaGVtZTpkYXJrO2JhY2tncm91bmQ6IzBmMTcxZH0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9c3lzdGVtXSAudmlld2VyLWFjdGlvbnMtLWZsb2F0aW5nW2RhdGEtdi1iZGU1MGNjOF17YmFja2dyb3VuZDpyZ2JhKDE0LDIyLDI4LC45NCk7Ym9yZGVyLWNvbG9yOnJnYmEoMTY3LDE4NSwxOTgsLjE2KTtib3gtc2hhZG93OjAgMjBweCA1MnB4IHJnYmEoMCwwLDAsLjM0KX0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9c3lzdGVtXSAudmlld2VyLWFjdGlvbnNbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOnJnYmEoMTQsMjIsMjgsLjk0KTtib3JkZXItYm90dG9tLWNvbG9yOnJnYmEoMTY3LDE4NSwxOTgsLjEyKX0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9c3lzdGVtXSAudmlld2VyLWFjdGlvbnMgYnV0dG9uW2RhdGEtdi1iZGU1MGNjOF17Y29sb3I6I2I4YzdkNX0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9c3lzdGVtXSAudmlld2VyLWFjdGlvbnMtZ3JvdXBbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOnJnYmEoMTY3LDE4NSwxOTgsLjA4KTtib3JkZXItY29sb3I6cmdiYSgxNjcsMTg1LDE5OCwuMTMpfS5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1zeXN0ZW1dIC52aWV3ZXItYWN0aW9ucyBidXR0b25bZGF0YS12LWJkZTUwY2M4XTpob3Zlcjpub3QoOmRpc2FibGVkKXtjb2xvcjojNWVlMGFlO2JhY2tncm91bmQ6cmdiYSg0NSwyMTIsMTU0LC4xNCl9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLnZpZXdlci1hY3Rpb25zIGJ1dHRvbltkYXRhLXYtYmRlNTBjYzhdOmRpc2FibGVke2NvbG9yOiM2Njc4ODh9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLmNvbnRlbnRbZGF0YS12LWJkZTUwY2M4XXtiYWNrZ3JvdW5kOiMxNDFjMjN9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLnN0YXRlLXBhbmVsW2RhdGEtdi1iZGU1MGNjOF17YmFja2dyb3VuZDpsaW5lYXItZ3JhZGllbnQocmdiYSgxNSwyMywzMCwuOTIpLHJnYmEoMTEsMTcsMjIsLjk4KSl9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLmxvYWRpbmctY2FyZFtkYXRhLXYtYmRlNTBjYzhdLC5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1zeXN0ZW1dIC5lcnJvci1jYXJkW2RhdGEtdi1iZGU1MGNjOF17YmFja2dyb3VuZDpyZ2JhKDE5LDI5LDM3LC45NCk7Ym9yZGVyLWNvbG9yOnJnYmEoMTM5LDE2MSwxNzcsLjE2KTtib3gtc2hhZG93OjAgMjJweCA1MnB4IHJnYmEoMCwwLDAsLjM0KX0uZmlsZS12aWV3ZXJbZGF0YS12aWV3ZXItdGhlbWU9c3lzdGVtXSAubG9hZGluZy1jb3B5IHN0cm9uZ1tkYXRhLXYtYmRlNTBjYzhdLC5maWxlLXZpZXdlcltkYXRhLXZpZXdlci10aGVtZT1zeXN0ZW1dIC5lcnJvci1jYXJkIHN0cm9uZ1tkYXRhLXYtYmRlNTBjYzhde2NvbG9yOiNlZmY3ZmJ9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLmxvYWRpbmctY29weSBwW2RhdGEtdi1iZGU1MGNjOF0sLmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLmVycm9yLWNhcmQgcFtkYXRhLXYtYmRlNTBjYzhde2NvbG9yOiM5ZWIwYmZ9LmZpbGUtdmlld2VyW2RhdGEtdmlld2VyLXRoZW1lPXN5c3RlbV0gLmVycm9yLWNhcmQgc3Ryb25nW2RhdGEtdi1iZGU1MGNjOF17Y29sb3I6I2ZmOWM5MX19QG1lZGlhIChtYXgtd2lkdGg6NzY3cHgpey52aWV3ZXItYWN0aW9ucy0tZmxvYXRpbmdbZGF0YS12LWJkZTUwY2M4XXtyaWdodDpjYWxjKDEwcHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LXJpZ2h0LDBweCkpO2JvdHRvbTpjYWxjKDEwcHggKyBlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSwwcHgpKTtnYXA6NHB4O21heC13aWR0aDpjYWxjKDEwMCUgLSAyMHB4KTtwYWRkaW5nOjVweDtvdmVyZmxvdy14OmF1dG99LnZpZXdlci1hY3Rpb25zLS1mbG9hdGluZyBidXR0b25bZGF0YS12LWJkZTUwY2M4XXttaW4td2lkdGg6NDBweDtoZWlnaHQ6MzBweDtwYWRkaW5nOjAgOXB4fX0uZmlsZS1yZW5kZXJ7d2lkdGg6MTAwJTttaW4td2lkdGg6MDtoZWlnaHQ6MTAwJTttaW4taGVpZ2h0OjB9Ci8qJHZpdGUkOjEqLw==";
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/asyncToGenerator.js
function Be(e, t, n, r, i, a, o) {
	try {
		var s = e[a](o), c = s.value;
	} catch (e) {
		n(e);
		return;
	}
	s.done ? t(c) : Promise.resolve(c).then(r, i);
}
function L(e) {
	return function() {
		var t = this, n = arguments;
		return new Promise(function(r, i) {
			var a = e.apply(t, n);
			function o(e) {
				Be(a, r, i, o, s, "next", e);
			}
			function s(e) {
				Be(a, r, i, o, s, "throw", e);
			}
			o(void 0);
		});
	};
}
//#endregion
//#region ../../../node_modules/.pnpm/@lucide+vue@1.17.0_vue@3.5.35_typescript@6.0.3_/node_modules/@lucide/vue/dist/esm/shared/src/utils/isEmptyString.mjs
var Ve = (e) => e === "", He = (...e) => e.filter((e, t, n) => !!e && e.trim() !== "" && n.indexOf(e) === t).join(" ").trim(), Ue = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), We = (e) => e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, n) => n ? n.toUpperCase() : t.toLowerCase()), Ge = (e) => {
	let t = We(e);
	return t.charAt(0).toUpperCase() + t.slice(1);
}, R = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": 2,
	"stroke-linecap": "round",
	"stroke-linejoin": "round"
}, z = Symbol("lucide-icons");
function Ke() {
	return c(z, {});
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/objectWithoutPropertiesLoose.js
function qe(e, t) {
	if (e == null) return {};
	var n = {};
	for (var r in e) if ({}.hasOwnProperty.call(e, r)) {
		if (t.includes(r)) continue;
		n[r] = e[r];
	}
	return n;
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/objectWithoutProperties.js
function Je(e, t) {
	if (e == null) return {};
	var n, r, i = qe(e, t);
	if (Object.getOwnPropertySymbols) {
		var a = Object.getOwnPropertySymbols(e);
		for (r = 0; r < a.length; r++) n = a[r], t.includes(n) || {}.propertyIsEnumerable.call(e, n) && (i[n] = e[n]);
	}
	return i;
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/typeof.js
function B(e) {
	"@babel/helpers - typeof";
	return B = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, B(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/toPrimitive.js
function V(e, t) {
	if (B(e) != "object" || !e) return e;
	var n = e[Symbol.toPrimitive];
	if (n !== void 0) {
		var r = n.call(e, t || "default");
		if (B(r) != "object") return r;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (t === "string" ? String : Number)(e);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/toPropertyKey.js
function H(e) {
	var t = V(e, "string");
	return B(t) == "symbol" ? t : t + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/defineProperty.js
function Ye(e, t, n) {
	return (t = H(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/objectSpread2.js
function Xe(e, t) {
	var n = Object.keys(e);
	if (Object.getOwnPropertySymbols) {
		var r = Object.getOwnPropertySymbols(e);
		t && (r = r.filter(function(t) {
			return Object.getOwnPropertyDescriptor(e, t).enumerable;
		})), n.push.apply(n, r);
	}
	return n;
}
function U(e) {
	for (var t = 1; t < arguments.length; t++) {
		var n = arguments[t] == null ? {} : arguments[t];
		t % 2 ? Xe(Object(n), !0).forEach(function(t) {
			Ye(e, t, n[t]);
		}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Xe(Object(n)).forEach(function(t) {
			Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(n, t));
		});
	}
	return e;
}
//#endregion
//#region ../../../node_modules/.pnpm/@lucide+vue@1.17.0_vue@3.5.35_typescript@6.0.3_/node_modules/@lucide/vue/dist/esm/Icon.mjs
var Ze = [
	"name",
	"iconNode",
	"absoluteStrokeWidth",
	"absolute-stroke-width",
	"strokeWidth",
	"stroke-width",
	"size",
	"color"
], W = (e, { slots: n }) => {
	var r, i, a;
	let { name: o, iconNode: c, absoluteStrokeWidth: l, "absolute-stroke-width": u, strokeWidth: d, "stroke-width": f, size: p, color: m } = e, h = Je(e, Ze), { size: g, color: _, strokeWidth: v = 2, absoluteStrokeWidth: y = !1, class: b = "" } = Ke(), x = t(() => {
		let e = Ve(l) || Ve(u) || l === !0 || u === !0 || y === !0, t = d || f || v || R["stroke-width"];
		if (e) {
			var n;
			return Number(t) * 24 / Number((n = p == null ? g : p) == null ? R.width : n);
		}
		return t;
	});
	return s("svg", U(U(U({}, R), h), {}, {
		width: (r = p == null ? g : p) == null ? R.width : r,
		height: (i = p == null ? g : p) == null ? R.height : i,
		stroke: (a = m == null ? _ : m) == null ? R.stroke : a,
		"stroke-width": x.value,
		class: He("lucide", b, ...o ? [`lucide-${Ue(Ge(o))}-icon`, `lucide-${Ue(o)}`] : ["lucide-icon"])
	}), [...c.map((e) => s(...e)), ...n.default ? [n.default()] : []]);
}, G = (e, t) => (n, { slots: r, attrs: i }) => s(W, U(U(U({}, i), n), {}, {
	iconNode: t,
	name: e
}), r.default ? { default: r.default } : void 0), Qe = G("rotate-ccw", [["path", {
	d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
	key: "1357e3"
}], ["path", {
	d: "M3 3v5h5",
	key: "1xhq8a"
}]]), $e = G("zoom-in", [
	["circle", {
		cx: "11",
		cy: "11",
		r: "8",
		key: "4ej97u"
	}],
	["line", {
		x1: "21",
		x2: "16.65",
		y1: "21",
		y2: "16.65",
		key: "13gj7c"
	}],
	["line", {
		x1: "11",
		x2: "11",
		y1: "8",
		y2: "14",
		key: "1vmskp"
	}],
	["line", {
		x1: "8",
		x2: "14",
		y1: "11",
		y2: "11",
		key: "durymu"
	}]
]), et = G("zoom-out", [
	["circle", {
		cx: "11",
		cy: "11",
		r: "8",
		key: "4ej97u"
	}],
	["line", {
		x1: "21",
		x2: "16.65",
		y1: "21",
		y2: "16.65",
		key: "13gj7c"
	}],
	["line", {
		x1: "8",
		x2: "14",
		y1: "11",
		y2: "11",
		key: "durymu"
	}]
]), tt = (e, n) => {
	let r = se(y(e), y(n)), i = m(r.getState()), a = ce(i, r);
	return x(() => [y(e), y(n)], ([e, t]) => {
		a.setExtension(e), a.setI18n(t);
	}, { deep: !0 }), {
		loading: t(() => i.loading),
		error: t(() => i.error),
		message: t(() => i.message),
		theme: t(() => i.theme),
		styleVars: t(() => i.styleVars),
		startLoading: a.startLoading,
		setLoadingMessage: a.setLoadingMessage,
		stopLoading: a.stopLoading,
		showError: a.showError,
		clearError: a.clearError,
		resetLoading: a.resetLoading,
		syncLoadingState: a.syncLoadingState
	};
}, nt = ({ output: e, getOptions: t, emitSearchChange: n, emitLocationChange: r }) => {
	let i = re({
		root: () => e.value,
		searchTarget: {
			anchors: _([]),
			state: m(D())
		},
		searchOptions: () => {
			var e;
			return (e = t()) == null ? void 0 : e.search;
		},
		waitForDomUpdate: () => l(),
		getAiOptions: () => {
			var e;
			return (e = t()) == null ? void 0 : e.ai;
		},
		onSearchChange: n,
		onLocationChange: r
	});
	return f(() => {
		i.destroyDocumentFeatures();
	}), {
		refreshDocumentIndex: i.refreshDocumentIndex,
		clearDocumentState: i.clearDocumentState,
		getScrollContainer: i.getScrollContainer,
		searchDocument: i.searchDocument,
		clearDocumentSearch: i.clearDocumentSearch,
		nextSearchResult: i.nextSearchResult,
		previousSearchResult: i.previousSearchResult,
		getSearchState: i.getSearchState,
		collectDocumentAnchors: i.collectDocumentAnchors,
		scrollToAnchor: i.scrollToAnchor,
		scrollToLine: i.scrollToLine,
		getDocumentTextChunks: i.getDocumentTextChunks
	};
}, rt = ({ activeExportAdapter: e, currentBuffer: t, currentFile: n, currentSourceUrl: r, displayFilename: i, formatErrorMessage: a, getOptions: o, operationAvailability: s, output: c, runBeforeOperation: l, showError: u, watermarkInlineStyle: d }) => de({
	getBuffer: () => t.value,
	getFile: () => n.value,
	getUrl: () => r.value,
	getFilename: () => i.value,
	getMimeType: () => {
		var e;
		return (e = n.value) == null ? void 0 : e.type;
	},
	getRenderedSource: () => c.value,
	getAdapter: () => e.value,
	getWatermarkInlineStyle: () => d.value,
	getPrintAvailable: () => s.value.print,
	getI18n: o,
	beforeOperation: l,
	formatErrorMessage: a,
	onErrorMessage: u
}), it = ({ output: e, getOptions: t, refreshZoomProvider: n, refreshViewStateProvider: r, emitFitChange: i }) => {
	let a = ae({
		root: () => e.value,
		getFit: () => {
			var e;
			return (e = t()) == null ? void 0 : e.fit;
		},
		onFit: (e) => {
			n(), r(), i(e);
		}
	});
	return {
		startFitObserver: () => a.observe(),
		stopFitObserver: () => a.destroy(),
		resetAutoFit: () => a.resetAutoFit(),
		markFitUserInteraction: () => a.markUserInteraction(),
		applyInitialFit: () => {
			var e;
			return a.applyInitialFit({ skip: we((e = t()) == null ? void 0 : e.initialViewState) });
		},
		fitToView: (e) => a.fit(e, {
			source: "api",
			reason: "api"
		})
	};
}, at = ({ getOptions: e, getFilename: t, getBufferSize: n, getCurrentFile: r, getCurrentVersion: i, getFallbackFile: a, getFallbackUrl: o, emitLifecycle: s, emitOperationBefore: c, emitOperationCancel: l, formatErrorMessage: u, handleLifecycleError: d, handleOperationError: f, onOperationErrorMessage: p }) => oe({
	getOptions: e,
	getFilename: t,
	getBufferSize: n,
	getCurrentFile: r,
	getCurrentVersion: i,
	getFallbackFile: a,
	getFallbackUrl: o,
	emitLifecycle: s,
	emitOperationBefore: c,
	emitOperationCancel: l,
	formatErrorMessage: u,
	handleLifecycleError: d,
	handleOperationError: f,
	onOperationErrorMessage: p
}), ot = ({ filename: e, getFile: n, getUrl: r, getSourceFilename: i, getOptions: a }) => {
	let o = t(() => Ne({
		filename: (i == null ? void 0 : i()) || e.value,
		file: n(),
		url: r(),
		options: a()
	}));
	return {
		displayFilename: t(() => o.value.displayFilename),
		currentExtend: t(() => o.value.extension),
		normalizedToolbar: t(() => o.value.toolbar),
		viewerTheme: t(() => o.value.theme),
		viewerDensity: t(() => o.value.density),
		formatErrorMessage: (e, t) => Ce(e, t, a())
	};
}, st = ({ currentExtend: e, error: n, loadingTheme: r, getOptions: i }) => t(() => ie(e.value, n.value, r.value, i == null ? void 0 : i())), ct = ({ getFile: e, getUrl: t, getSourceFilename: n, refreshPreview: r, cancelPreview: i, clearRenderedContent: a, resetLoading: o, stopZoomObserver: s, stopFitObserver: c, stopViewStateObserver: l }) => {
	x([
		e,
		t,
		n || (() => void 0)
	], () => {
		F({ onRefreshPreview: r });
	}, { immediate: !0 }), f(() => {
		Le({
			onCancelPreview: i,
			onClearRenderedContent: a,
			onResetLoading: o,
			onStopZoomObserver: s,
			onStopFitObserver: c,
			onStopViewStateObserver: l
		});
	});
}, lt = ["operationAvailability"], ut = (e) => {
	let { operationAvailability: t } = e;
	return ue(U(U({}, Je(e, lt)), {}, { getOperationAvailability: () => t.value }));
}, dt = (e) => ({
	$el: e,
	unmount() {}
}), ft = [...E], K = function() {
	var e = L(function* (e, t, n) {
		let r = j(n), i = document.createElement("div");
		i.style.textAlign = "center", i.style.marginTop = "80px";
		let a = document.createElement("div");
		if (a.textContent = r.message, i.appendChild(a), r.description) {
			let e = document.createElement("div");
			e.textContent = r.description, i.appendChild(e);
		}
		return t.replaceChildren(i), dt(t);
	});
	return function(t, n, r) {
		return e.apply(this, arguments);
	};
}(), q = ee({
	definitions: C,
	handlers: ft
}), pt = q.registry, mt = k({
	registry: pt,
	handlers: ft,
	fallbackHandler: K
});
q.missingRendererIds, mt.handlersByExtension;
//#endregion
//#region src/package/components/FileViewer/rendererBridge.ts
var ht = (e = {}) => {
	let t = e.autoRenderers;
	return typeof t == "boolean" ? t : (t == null ? void 0 : t.enabled) === void 0 ? (e.rendererMode || "extend") !== "replace" : t.enabled;
}, gt = function() {
	var e = L(function* (e) {
		let t = (e == null ? void 0 : e.options) || {}, n = t.rendererMode === "replace" ? Se([]) : ne({ builtinRenderers: t.builtinRenderers }).registry, r = [];
		ht(t) && r.push(...Ee());
		let i = t.preset, a = t.presets;
		r.push(...Pe(i), ...Pe(a)), t.renderers && r.push(t.renderers);
		let o = T(r);
		return o.length && (yield Te({
			registry: n,
			plugins: o,
			registerHandler: (e) => {
				let t = n.getById(e.rendererId);
				t && n.register(U(U({}, t), {}, { load: O({
					handler: e.handler,
					rendererId: t.id,
					getTarget: (e) => e.surface.container
				}) }));
			}
		})), n;
	});
	return function(t) {
		return e.apply(this, arguments);
	};
}();
function J(e, t, n, r) {
	return Y.apply(this, arguments);
}
function Y() {
	return Y = L(function* (e, t, n, r) {
		let i = (yield gt(r)).getByExtension(t) || pt.getByExtension(t);
		if (i != null && i.load) {
			var a, o;
			return yield i.load({
				source: Oe({
					buffer: e,
					filename: (r == null ? void 0 : r.filename) || `preview.${t}`,
					type: t,
					url: r == null ? void 0 : r.url
				}),
				surface: {
					container: n,
					shadowRoot: r == null || (a = r.surface) == null ? void 0 : a.shadowRoot,
					styleIsolation: r == null || (o = r.surface) == null ? void 0 : o.styleIsolation
				},
				options: (r == null ? void 0 : r.options) || {},
				registerExportAdapter: r == null ? void 0 : r.registerExportAdapter,
				renderContext: r
			});
		}
		return te(yield Ae({
			dispatcher: mt,
			buffer: e,
			target: n,
			type: t,
			context: r
		}));
	}), Y.apply(this, arguments);
}
//#endregion
//#region src/package/vendors/nestedRender.ts
var _t = function() {
	var e = L(function* (e, t, n, r) {
		var i;
		let a = yield J(e, t.toLowerCase(), n, U(U({}, r), {}, { renderNestedBuffer: (r == null ? void 0 : r.renderNestedBuffer) || _t }));
		return {
			$el: (i = a.rendered) == null ? void 0 : i.$el,
			destroy: () => {
				var e;
				return (e = a.destroy) == null ? void 0 : e.call(a);
			}
		};
	});
	return function(t, n, r, i) {
		return e.apply(this, arguments);
	};
}(), vt = ({ output: e, getOptions: t, isCurrentRequest: n, notifyActiveUnloadStart: r, notifyActiveUnloadComplete: i, clearActiveDocumentContext: a, clearDocumentState: o, refreshDocumentIndex: s, startZoomObserver: c, stopZoomObserver: u, clearZoomProvider: d, refreshZoomProvider: f, startFitObserver: p, stopFitObserver: m, applyInitialFit: g, startViewStateObserver: v, stopViewStateObserver: y, clearViewStateProvider: b, refreshViewStateProvider: x }) => {
	let S = _(null), C = h(!1), w = h(!1), T = fe({
		renderedReady: {
			get: () => C.value,
			set: (e) => {
				C.value = e;
			}
		},
		progressiveReady: {
			get: () => w.value,
			set: (e) => {
				w.value = e;
			}
		}
	}), E = null, D = pe({
		getContainer: () => e.value,
		surfaceState: me({
			session: {
				get: () => E,
				set: (e) => {
					E = e;
				}
			},
			exportAdapter: {
				get: () => S.value,
				set: (e) => {
					S.value = e;
				}
			}
		}),
		readinessState: T,
		isCurrent: n,
		waitForContainer: l,
		onUnloadStart: r,
		onUnloadComplete: (e, t) => {
			i(e == null ? null : e, t);
		},
		onClearActiveDocumentContext: a,
		onClearDocumentState: o,
		onStartZoomObserver: c,
		onStopZoomObserver: u,
		onClearZoomProvider: d,
		onStartFitObserver: p,
		onStopFitObserver: m,
		onApplyInitialFit: g,
		onStartViewStateObserver: v,
		onStopViewStateObserver: y,
		onClearViewStateProvider: b,
		onRefreshDocumentIndex: s,
		onRefreshZoomProvider: f,
		onRefreshViewStateProvider: x,
		render: function() {
			var e = L(function* ({ buffer: e, type: n, target: r, filename: i, sourceUrl: a, streamUrl: o, registerExportAdapter: s, onProgressiveRender: c }) {
				return yield J(e, n, r, {
					filename: i,
					url: a,
					streamUrl: o,
					options: t(),
					registerExportAdapter: s,
					onProgressiveRender: c,
					renderNestedBuffer: function() {
						var e = L(function* (e, n, r, i) {
							return yield _t(e, n, r, U(U({}, i), {}, { options: (i == null ? void 0 : i.options) || t() }));
						});
						return function(t, n, r, i) {
							return e.apply(this, arguments);
						};
					}()
				});
			});
			return function(t) {
				return e.apply(this, arguments);
			};
		}()
	});
	return U({
		activeExportAdapter: S,
		renderedReady: C,
		progressiveReady: w
	}, D);
}, yt = ({ getFile: e, getUrl: t, getSourceFilename: n, getOptions: r, filename: i, currentFile: a, currentBuffer: o, currentSourceUrl: s, renderedReady: c, progressiveReady: l, requestController: u, clearRenderedContent: d, mountRenderedContent: f, destroyRenderSession: p, setActiveRenderSession: m, buildLoadStartState: h, buildRenderCompleteState: g, notifyLifecycle: _, setActiveDocumentContext: v, markLoadStarted: y, clearLoadStarted: b, startLoading: x, setLoadingMessage: S, stopLoading: C, showError: w, clearError: T, resetLoading: E, formatErrorMessage: D }) => {
	let O = A({
		getFile: e,
		getUrl: t,
		getCurrentFilename: () => (n == null ? void 0 : n()) || i.value,
		getPdfStreaming: () => {
			var e;
			return (e = r()) == null || (e = e.pdf) == null ? void 0 : e.streaming;
		},
		getI18n: r,
		getPageHref: () => window.location.href,
		previewTarget: le({
			filename: {
				get: () => i.value,
				set: (e) => {
					i.value = e;
				}
			},
			file: {
				get: () => a.value,
				set: (e) => {
					a.value = e;
				}
			},
			buffer: {
				get: () => o.value,
				set: (e) => {
					o.value = e;
				}
			},
			sourceUrl: {
				get: () => s.value,
				set: (e) => {
					s.value = e;
				}
			},
			renderedReady: {
				get: () => c.value,
				set: (e) => {
					c.value = e;
				}
			},
			progressiveReady: {
				get: () => l.value,
				set: (e) => {
					l.value = e;
				}
			}
		}),
		requestController: u,
		downloadFile: function() {
			var e = L(function* ({ url: e, signal: t }) {
				let n = yield fetch(e, { signal: t });
				if (!n.ok) throw Error(`${Re(r(), "error.remoteDownload")}: HTTP ${n.status}`);
				return n.blob();
			});
			return function(t) {
				return e.apply(this, arguments);
			};
		}(),
		mountRenderedContent: f,
		destroyRenderSession: p,
		buildLoadStartState: h,
		buildRenderCompleteState: g,
		onMarkLoadStarted: y,
		onClearLoadStarted: b,
		onStartLoading: x,
		onSetLoadingMessage: S,
		onStopLoading: C,
		onShowError: w,
		onClearError: T,
		onResetLoading: E,
		onClearRenderedContent: d,
		onSession: m,
		onActiveDocumentContext: v,
		onLifecycle: _,
		formatErrorMessage: D
	});
	return U(U({}, O), {}, {
		cancelPreview: (e = "component-unmount") => {
			O.cancelPreview(e);
		},
		refreshPreview: function() {
			var e = L(function* () {
				yield O.refreshPreview();
			});
			return function() {
				return e.apply(this, arguments);
			};
		}(),
		resetViewer: (e) => {
			O.resetViewer(e);
		}
	});
}, bt = ({ activeExportAdapter: e, currentBuffer: n, currentExtend: r, currentFile: i, currentSourceUrl: a, error: o, getOptions: s, getZoomState: c, loading: l, normalizedToolbar: u, renderedReady: d, zoomState: f, emitOperationAvailabilityChange: p, emitZoomChange: m }) => {
	let h = ge({
		getAdapter: () => e.value,
		getBuffer: () => n.value,
		getExtension: () => r.value,
		getFile: () => i.value,
		getHasError: () => !!o.value,
		getLoading: () => l.value,
		getOptions: s,
		getSourceUrl: () => a.value,
		getToolbar: () => u.value,
		getRenderedReady: () => d.value,
		getZoomState: c,
		zoomSyncState: f,
		onOperationAvailabilityChange: p,
		onZoomChange: m
	}), g = t(() => h.resolveToolbarState()), _ = t(() => g.value.operationAvailability), v = t(() => g.value.visibleToolbar), y = t(() => g.value.toolbarOrder), b = t(() => g.value.showToolbar), S = t(() => g.value.toolbarPosition), C = t(() => g.value.toolbarDisabled);
	return x(_, (e) => {
		h.syncOperationAvailability(e);
	}, { immediate: !0 }), x(() => h.createZoomSyncSnapshot(), () => {
		h.syncZoomChange();
	}, { immediate: !0 }), {
		operationAvailability: _,
		visibleToolbar: v,
		toolbarOrder: y,
		showToolbar: b,
		toolbarPosition: S,
		toolbarDisabled: C,
		zoomButtonDisabled: (e) => h.isZoomButtonDisabled(e)
	};
}, xt = ({ output: e, emitViewStateChange: t }) => ye(ve({
	root: () => e.value,
	onChange: t
})), St = (e) => {
	let n = t(() => Ie(e()));
	return {
		normalizedWatermark: t(() => n.value.normalizedWatermark),
		watermarkStyle: t(() => n.value.watermarkStyle),
		watermarkInlineStyle: t(() => n.value.watermarkInlineStyle)
	};
}, Ct = ({ output: e, enabled: t, runBeforeOperation: n }) => {
	let r = m(M()), i = xe(r, be({
		root: () => e.value,
		enabled: t,
		beforeZoom: (e) => n(e),
		onChange: (e) => {
			w(r, e);
		}
	}));
	return U({ zoomState: r }, i);
}, wt = ["data-viewer-theme", "data-viewer-density"], Tt = { class: "viewer-stage" }, Et = ["data-toolbar-position"], Dt = ["aria-label"], Ot = [
	"disabled",
	"title",
	"aria-label"
], kt = ["disabled", "title"], At = ["title", "aria-label"], jt = [
	"disabled",
	"title",
	"aria-label"
], Mt = [
	"disabled",
	"title",
	"aria-label"
], Nt = ["disabled", "title"], Pt = ["disabled", "title"], Ft = ["disabled", "title"], It = { class: "viewer-content-shell" }, Lt = {
	key: 1,
	class: "state-panel loading-panel"
}, Rt = { class: "loading-card" }, zt = { class: "loading-icon" }, Bt = { class: "loading-copy" }, Vt = { class: "loading-kicker" }, Ht = {
	key: 2,
	class: "state-panel error-panel"
}, Ut = { class: "error-card" }, X = /* @__PURE__ */ ((e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
})(/* @__PURE__ */ o({
	__name: "FileViewer",
	props: {
		file: {},
		url: {},
		name: {},
		filename: {},
		type: {},
		size: {},
		options: {}
	},
	emits: [
		"load-start",
		"load-complete",
		"unload-start",
		"unload-complete",
		"operation-before",
		"operation-cancel",
		"operation-availability-change",
		"search-change",
		"location-change",
		"zoom-change",
		"view-state-change",
		"fit-change"
	],
	setup(o, { expose: s, emit: c }) {
		let l = o, f = c, m = h(""), _ = h(null), y = h(null), x = h(null), S = h(null), C = t(() => {
			let e = _e(l.options);
			return {
				zoomGroup: e("toolbar.zoomGroup"),
				zoomOut: e("toolbar.zoomOut"),
				zoomIn: e("toolbar.zoomIn"),
				zoomReset: e("toolbar.zoomReset"),
				download: e("toolbar.download"),
				downloadTitle: e("toolbar.downloadTitle"),
				print: e("toolbar.print"),
				printTitle: e("toolbar.printTitle"),
				exportHtml: e("toolbar.exportHtml"),
				exportHtmlTitle: e("toolbar.exportHtmlTitle")
			};
		}), { refreshDocumentIndex: w, clearDocumentState: T, getScrollContainer: E, searchDocument: D, clearDocumentSearch: O, nextSearchResult: ee, previousSearchResult: te, getSearchState: ne, collectDocumentAnchors: re, scrollToAnchor: ie, scrollToLine: ae, getDocumentTextChunks: oe } = nt({
			output: _,
			getOptions: () => l.options,
			emitSearchChange: (e) => f("search-change", e),
			emitLocationChange: (e) => f("location-change", e)
		}), { displayFilename: se, currentExtend: ce, normalizedToolbar: le, viewerTheme: ue, viewerDensity: de, formatErrorMessage: fe } = ot({
			filename: m,
			getFile: () => l.file,
			getUrl: () => l.url,
			getSourceFilename: () => l.filename || l.name,
			getOptions: () => l.options
		}), { watermarkStyle: pe, watermarkInlineStyle: me } = St(() => {
			var e;
			return (e = l.options) == null ? void 0 : e.watermark;
		}), { loading: k, error: A, message: ge, theme: j, styleVars: ve, startLoading: ye, setLoadingMessage: be, stopLoading: xe, showError: M, clearError: Se, resetLoading: N } = tt(ce, () => l.options), Ce = st({
			currentExtend: ce,
			error: A,
			loadingTheme: j,
			getOptions: () => l.options
		}), { requestController: P, getCurrentVersion: we, isCurrentRequest: Te } = he(), { markLoadStarted: Ee, clearLoadStarted: De, notifyLifecycle: Oe, notifyActiveUnloadStart: ke, notifyActiveUnloadComplete: Ae, setActiveDocumentContext: Ne, clearActiveDocumentContext: Pe, buildLoadStartState: Fe, buildRenderCompleteState: Ie, runBeforeOperation: Le } = at({
			getOptions: () => l.options,
			getFilename: () => m.value,
			getBufferSize: () => {
				var e;
				return (e = x.value) == null ? void 0 : e.byteLength;
			},
			getCurrentFile: () => y.value,
			getCurrentVersion: we,
			getFallbackFile: () => l.file,
			getFallbackUrl: () => l.url,
			emitLifecycle: f,
			emitOperationBefore: (e) => f("operation-before", e),
			emitOperationCancel: (e) => f("operation-cancel", e),
			formatErrorMessage: fe,
			handleLifecycleError: (e, t) => {
				je({
					error: e,
					context: t
				});
			},
			handleOperationError: (e, t) => {
				Me({
					error: e,
					context: t
				});
			},
			onOperationErrorMessage: M
		}), { zoomState: F, refreshZoomProvider: Re, startZoomObserver: ze, stopZoomObserver: I, clearZoomProvider: Be, zoomIn: Ve, zoomOut: He, resetZoom: Ue, getZoomState: We } = Ct({
			output: _,
			enabled: () => !0,
			runBeforeOperation: Le
		}), { refreshViewStateProvider: Ge, startViewStateObserver: R, stopViewStateObserver: z, clearViewStateProvider: Ke, getViewState: qe, applyViewState: Je } = xt({
			output: _,
			emitViewStateChange: (e) => {
				(e.source === "user" || e.source === "api") && e.action !== "fit" && H(), f("view-state-change", e);
			}
		}), { startFitObserver: B, stopFitObserver: V, markFitUserInteraction: H, applyInitialFit: Ye, fitToView: Xe } = it({
			output: _,
			getOptions: () => l.options,
			refreshZoomProvider: Re,
			refreshViewStateProvider: Ge,
			emitFitChange: (e) => f("fit-change", e)
		}), { activeExportAdapter: U, renderedReady: Ze, progressiveReady: W, clearRenderedContent: G, destroyRenderSession: lt, mountRenderedContent: dt, setActiveRenderSession: ft } = vt({
			output: _,
			getOptions: () => l.options,
			isCurrentRequest: Te,
			notifyActiveUnloadStart: ke,
			notifyActiveUnloadComplete: Ae,
			clearActiveDocumentContext: Pe,
			clearDocumentState: T,
			refreshDocumentIndex: w,
			startZoomObserver: ze,
			stopZoomObserver: I,
			clearZoomProvider: Be,
			refreshZoomProvider: Re,
			startFitObserver: B,
			stopFitObserver: V,
			applyInitialFit: Ye,
			startViewStateObserver: R,
			stopViewStateObserver: z,
			clearViewStateProvider: Ke,
			refreshViewStateProvider: Ge
		}), { operationAvailability: K, visibleToolbar: q, toolbarOrder: pt, showToolbar: mt, toolbarPosition: ht, toolbarDisabled: gt, zoomButtonDisabled: J } = bt({
			activeExportAdapter: U,
			currentBuffer: x,
			currentExtend: ce,
			currentFile: y,
			currentSourceUrl: S,
			error: A,
			getOptions: () => l.options,
			getZoomState: We,
			loading: k,
			normalizedToolbar: le,
			renderedReady: Ze,
			zoomState: F,
			emitOperationAvailabilityChange: (e) => f("operation-availability-change", e),
			emitZoomChange: (e) => f("zoom-change", e)
		}), { cancelPreview: Y, refreshPreview: _t } = yt({
			getFile: () => l.file,
			getUrl: () => l.url,
			getSourceFilename: () => l.filename || l.name,
			getOptions: () => l.options,
			filename: m,
			currentFile: y,
			currentBuffer: x,
			currentSourceUrl: S,
			renderedReady: Ze,
			progressiveReady: W,
			requestController: P,
			clearRenderedContent: G,
			mountRenderedContent: dt,
			destroyRenderSession: lt,
			setActiveRenderSession: ft,
			buildLoadStartState: Fe,
			buildRenderCompleteState: Ie,
			notifyLifecycle: Oe,
			setActiveDocumentContext: Ne,
			markLoadStarted: Ee,
			clearLoadStarted: De,
			startLoading: ye,
			setLoadingMessage: be,
			stopLoading: xe,
			showError: M,
			clearError: Se,
			resetLoading: N,
			formatErrorMessage: fe
		}), { downloadOriginalFile: X, exportRenderedHtml: Wt, printRenderedHtml: Z } = rt({
			activeExportAdapter: U,
			currentBuffer: x,
			currentFile: y,
			currentSourceUrl: S,
			displayFilename: se,
			formatErrorMessage: fe,
			getOptions: () => l.options,
			operationAvailability: K,
			output: _,
			runBeforeOperation: Le,
			showError: M,
			watermarkInlineStyle: me
		}), Q = function() {
			var e = L(function* () {
				return H(), Ve();
			});
			return function() {
				return e.apply(this, arguments);
			};
		}(), Gt = function() {
			var e = L(function* () {
				return H(), He();
			});
			return function() {
				return e.apply(this, arguments);
			};
		}(), Kt = function() {
			var e = L(function* () {
				return H(), Ue();
			});
			return function() {
				return e.apply(this, arguments);
			};
		}(), qt = () => {
			Y("component-unmount"), N(), I(), V(), z();
		};
		return s(ut({
			destroy: () => {
				qt();
			},
			downloadOriginalFile: X,
			printRenderedHtml: Z,
			exportRenderedHtml: Wt,
			zoomIn: Q,
			zoomOut: Gt,
			resetZoom: Kt,
			fitToView: Xe,
			getZoomState: We,
			getViewState: qe,
			applyViewState: function() {
				var e = L(function* (e, t) {
					return H(), Je(e, t);
				});
				return function(t, n) {
					return e.apply(this, arguments);
				};
			}(),
			operationAvailability: K,
			getScrollContainer: E,
			searchDocument: D,
			clearDocumentSearch: O,
			nextSearchResult: ee,
			previousSearchResult: te,
			getSearchState: ne,
			collectDocumentAnchors: re,
			scrollToAnchor: ie,
			scrollToLine: ae,
			getDocumentTextChunks: oe
		})), ct({
			getFile: () => l.file,
			getUrl: () => l.url,
			getSourceFilename: () => l.filename || l.name,
			refreshPreview: _t,
			cancelPreview: Y,
			clearRenderedContent: G,
			resetLoading: N,
			stopZoomObserver: I,
			stopFitObserver: V,
			stopViewStateObserver: z
		}), (t, o) => (p(), r("div", {
			class: "file-viewer",
			"data-viewer-theme": b(ue),
			"data-viewer-density": b(de),
			style: d(b(ve))
		}, [i("div", Tt, [b(mt) ? (p(), r("div", {
			key: 0,
			class: u(["viewer-actions", { "viewer-actions--floating": b(ht) === "bottom-right" }]),
			"data-toolbar-position": b(ht)
		}, [(p(!0), r(e, null, g(b(pt), (t) => (p(), r(e, { key: t }, [t === "zoom" && b(q).zoom ? (p(), r("div", {
			key: 0,
			class: "viewer-actions-group viewer-zoom-actions",
			"aria-label": C.value.zoomGroup
		}, [
			b(K).zoomOut ? (p(), r("button", {
				key: 0,
				type: "button",
				class: "viewer-icon-button",
				disabled: b(J)("canZoomOut"),
				title: C.value.zoomOut,
				"aria-label": C.value.zoomOut,
				onClick: Gt
			}, [a(b(et), {
				size: 15,
				"stroke-width": 2.4
			})], 8, Ot)) : n("", !0),
			b(K).zoomReset ? (p(), r("button", {
				key: 1,
				type: "button",
				class: "viewer-zoom-meter",
				disabled: b(J)("canReset"),
				title: C.value.zoomReset,
				onClick: Kt
			}, v(b(F).label), 9, kt)) : (p(), r("span", {
				key: 2,
				class: "viewer-zoom-meter viewer-zoom-meter--readonly",
				title: b(F).label,
				"aria-label": b(F).label
			}, v(b(F).label), 9, At)),
			b(K).zoomIn ? (p(), r("button", {
				key: 3,
				type: "button",
				class: "viewer-icon-button",
				disabled: b(J)("canZoomIn"),
				title: C.value.zoomIn,
				"aria-label": C.value.zoomIn,
				onClick: Q
			}, [a(b($e), {
				size: 15,
				"stroke-width": 2.4
			})], 8, jt)) : n("", !0),
			b(K).zoomReset ? (p(), r("button", {
				key: 4,
				type: "button",
				class: "viewer-icon-button",
				disabled: b(J)("canReset"),
				title: C.value.zoomReset,
				"aria-label": C.value.zoomReset,
				onClick: Kt
			}, [a(b(Qe), {
				size: 14,
				"stroke-width": 2.4
			})], 8, Mt)) : n("", !0)
		], 8, Dt)) : t === "download" && b(q).download ? (p(), r("button", {
			key: 1,
			type: "button",
			disabled: b(gt),
			title: C.value.downloadTitle,
			onClick: o[0] || (o[0] = (...e) => b(X) && b(X)(...e))
		}, v(C.value.download), 9, Nt)) : t === "print" && b(q).print ? (p(), r("button", {
			key: 2,
			type: "button",
			disabled: b(gt),
			title: C.value.printTitle,
			onClick: o[1] || (o[1] = (...e) => b(Z) && b(Z)(...e))
		}, v(C.value.print), 9, Pt)) : t === "exportHtml" && b(q).exportHtml ? (p(), r("button", {
			key: 3,
			type: "button",
			disabled: b(gt),
			title: C.value.exportHtmlTitle,
			onClick: o[2] || (o[2] = (...e) => b(Wt) && b(Wt)(...e))
		}, v(C.value.exportHtml), 9, Ft)) : n("", !0)], 64))), 128))], 10, Et)) : n("", !0), i("div", It, [
			i("div", {
				ref_key: "output",
				ref: _,
				class: u(["content", { hidden: b(k) && !b(W) || !!b(A) }]),
				"data-viewer-scroll-root": "true"
			}, null, 2),
			b(pe) ? (p(), r("div", {
				key: 0,
				class: "viewer-watermark",
				style: d(b(pe))
			}, null, 4)) : n("", !0),
			b(k) && !b(W) ? (p(), r("div", Lt, [i("div", Rt, [
				i("div", zt, v(b(j).badge), 1),
				i("div", Bt, [
					i("span", Vt, v(b(j).label), 1),
					i("strong", null, v(b(ge)), 1),
					i("p", null, v(b(j).hint), 1)
				]),
				o[3] || (o[3] = i("span", { class: "loading-ring" }, null, -1))
			])])) : b(A) ? (p(), r("div", Ht, [i("div", Ut, [i("strong", null, v(b(Ce).title), 1), i("p", null, v(b(Ce).message), 1)])])) : n("", !0)
		])])], 12, wt));
	}
}), [["__scopeId", "data-v-bde50cc8"]]), Wt = () => typeof window < "u" && typeof document < "u", Z = (e = {}) => !!(e.url || e.file || e.buffer), Q = (e = {}) => ({
	url: e.url,
	file: e.file,
	buffer: e.buffer,
	filename: e.filename || e.name,
	name: e.name,
	type: e.type,
	size: e.size
}), Gt = () => typeof fetch == "function", Kt = function() {
	var e = L(function* ({ url: e, signal: t }) {
		if (!Gt()) throw Error("fetch is not available in the current environment.");
		let n = yield fetch(e, { signal: t });
		if (!n.ok) throw Error(`Failed to fetch file: ${n.status} ${n.statusText}`);
		return n.blob();
	});
	return function(t) {
		return e.apply(this, arguments);
	};
}(), qt = (e) => De(e.filename || e.name || Fe({
	file: e.file,
	url: e.url,
	fallback: S
}), e.type ? `preview.${e.type}` : S), Jt = function() {
	var e = L(function* (e, t = {}) {
		let n = qt(e), r = e.type || P(n);
		if (e.buffer) {
			var i;
			return {
				buffer: e.buffer,
				filename: n,
				type: r,
				size: (i = e.size) == null ? e.buffer.byteLength : i,
				url: e.url
			};
		}
		if (e.file) {
			var a;
			let t = ze(e.file, n);
			return {
				file: t,
				buffer: yield ke(t),
				filename: t.name || n,
				type: r || P(t.name),
				size: (a = e.size) == null ? t.size : a,
				url: e.url
			};
		}
		if (e.url) {
			var o;
			let i = yield (t.fetchFile || Kt)({
				url: e.url,
				signal: t.signal,
				source: e
			});
			if (!i) throw Error("Downloaded file is empty.");
			let a = ze(i, n);
			return {
				file: a,
				buffer: yield ke(a),
				filename: a.name || n,
				type: r || P(a.name),
				size: (o = e.size) == null ? a.size : o,
				url: e.url
			};
		}
		return {
			filename: n,
			type: r
		};
	});
	return function(t) {
		return e.apply(this, arguments);
	};
}(), $ = function() {
	var e = L(function* (e, t, n) {
		return e ? t(e) : n;
	});
	return function(t, n, r) {
		return e.apply(this, arguments);
	};
}(), Yt = (e) => !!(e && typeof e == "object" && e.name === "AbortError"), Xt = (e, t = {}, n = {}) => {
	if (!Wt()) throw Error("Flyfish File Viewer can only be mounted in a browser DOM environment.");
	let r = !1, i = t, a = Z(i) ? Q(i) : null, o = null, s = /* @__PURE__ */ new Set(), c = {
		loading: !1,
		ready: !1,
		error: null,
		lastEvent: null,
		lifecycle: null,
		availability: null,
		search: null,
		zoom: null,
		location: null,
		viewState: null
	}, l = () => U(U({}, c), {}, {
		search: c.search ? U(U({}, c.search), {}, { matches: [...c.search.matches] }) : null,
		zoom: c.zoom ? U({}, c.zoom) : null,
		location: c.location ? U({}, c.location) : null,
		viewState: c.viewState ? U(U({}, c.viewState), {}, {
			zoom: c.viewState.zoom ? U({}, c.viewState.zoom) : void 0,
			scroll: c.viewState.scroll ? U({}, c.viewState.scroll) : void 0,
			navigation: c.viewState.navigation ? U({}, c.viewState.navigation) : void 0,
			extra: c.viewState.extra ? U({}, c.viewState.extra) : void 0
		}) : null
	}), u = (e) => {
		var t;
		let n = l();
		(t = i.onStateChange) == null || t.call(i, n, e), s.forEach((t) => t(n, e));
	}, d = N(e, {
		registry: n.registry,
		options: i.options,
		onEvent: (e) => {
			var t;
			c.lastEvent = e, e.type === "load-start" ? (c.loading = !0, c.ready = !1, c.error = null, c.lifecycle = e.payload) : e.type === "load-complete" ? (c.loading = !1, c.ready = !0, c.lifecycle = e.payload) : e.type === "unload-start" ? (c.loading = !0, c.ready = !1, c.lifecycle = e.payload) : e.type === "unload-complete" ? (c.loading = !1, c.ready = !1, c.lifecycle = e.payload) : e.type === "operation-availability-change" ? c.availability = e.payload : e.type === "search-change" ? c.search = e.payload : e.type === "location-change" ? c.location = e.payload : e.type === "zoom-change" ? c.zoom = e.payload : e.type === "view-state-change" && (c.viewState = e.payload.state), (t = i.onEvent) == null || t.call(i, e), u(e);
		}
	}), f = () => {
		o == null || o.abort(), o = null;
	}, p = function() {
		var e = L(function* (e) {
			f(), a = e, o = typeof AbortController < "u" ? new AbortController() : null;
			let t = o;
			try {
				c.loading = !0, c.error = null, u();
				let i = yield Jt(e, {
					fetchFile: n.fetchFile,
					signal: t == null ? void 0 : t.signal
				});
				return r || t != null && t.signal.aborted || o !== t ? null : yield d.load(i);
			} catch (r) {
				var i;
				if (Yt(r) && t != null && t.signal.aborted) return null;
				throw c.loading = !1, c.ready = !1, c.error = r, u(), (i = n.onError) == null || i.call(n, r, e), r;
			} finally {
				o === t && (o = null);
			}
		});
		return function(t) {
			return e.apply(this, arguments);
		};
	}();
	return a && p(a), {
		container: e,
		load(e) {
			return L(function* () {
				r || (i = e, d.updateOptions(i.options || {}), Z(i) && (yield p(Q(i))));
			})();
		},
		update() {
			return L(function* (e = {}) {
				var t;
				r || (i = U(U(U({}, i), e), {}, { options: (t = e.options) == null ? i.options : t }), d.updateOptions(i.options || {}), Z(i) ? yield p(Q(i)) : (a = null, yield d.load({ filename: S })));
			}).apply(this, arguments);
		},
		reload() {
			return L(function* () {
				r || a && (yield p(a));
			})();
		},
		destroy() {
			r || (r = !0, f(), d.destroy("component-unmount"), e.innerHTML = "");
		},
		getApi() {
			return d;
		},
		downloadOriginalFile() {
			return $(d, (e) => e.download(), void 0);
		},
		printRenderedHtml() {
			return $(d, (e) => e.print(), void 0);
		},
		exportRenderedHtml() {
			return $(d, (e) => e.exportHtml({ download: !0 }).then(() => void 0), void 0);
		},
		zoomIn() {
			return $(d, (e) => e.zoomIn(), null);
		},
		zoomOut() {
			return $(d, (e) => e.zoomOut(), null);
		},
		resetZoom() {
			return $(d, (e) => e.resetZoom(), null);
		},
		fitToView(e) {
			return $(d, (t) => t.fitToView(e), null);
		},
		getViewState() {
			return d.getViewState();
		},
		applyViewState(e, t) {
			return $(d, (n) => n.applyViewState(e, t), null);
		},
		searchDocument(e) {
			return $(d, (t) => t.search(e), null);
		},
		clearDocumentSearch() {
			return $(d, (e) => e.clearSearch(), null);
		},
		nextSearchResult() {
			return $(d, (e) => e.nextSearchResult(), null);
		},
		previousSearchResult() {
			return $(d, (e) => e.previousSearchResult(), null);
		},
		collectDocumentAnchors() {
			return $(d, (e) => e.collectDocumentAnchors(), []);
		},
		scrollToAnchor(e) {
			return $(d, (t) => t.scrollToDocumentAnchor(e), !1);
		},
		scrollToLine(e) {
			return $(d, (t) => t.scrollToLine(e), !1);
		},
		getDocumentTextChunks() {
			return d.getDocumentTextChunks();
		},
		getOperationAvailability() {
			return d.getCapabilities();
		},
		getZoomState() {
			return d.getZoomState();
		},
		getSearchState() {
			return d.getSearchState();
		},
		getState() {
			return l();
		},
		subscribe(e) {
			return s.add(e), e(l()), () => {
				s.delete(e);
			};
		}
	};
}, Zt = () => {
	if (typeof document > "u" || document.querySelector("link[data-file-viewer-style=\"true\"]")) return;
	let e = document.createElement("link");
	e.rel = "stylesheet", e.href = I, e.dataset.fileViewerStyle = "true", document.head.appendChild(e);
}, Qt = (e, t = {}) => {
	var n;
	Zt();
	let r = t.source || t;
	return Xt(e, U(U({}, t.autoLoad === !1 ? {} : {
		url: r.url,
		file: r.file,
		buffer: r.buffer,
		name: r.name || t.name,
		filename: r.filename || t.filename,
		type: r.type || t.type,
		size: (n = r.size) == null ? t.size : n
	}), {}, {
		options: t.options,
		onEvent: t.onEvent
	}), {
		registry: pt,
		fetchFile: t.fetchFile,
		onError: t.onError
	});
}, $t = Qt, en = [["file-viewer", X]], tn = class {
	constructor() {
		Ye(this, "installed", !1);
	}
	install(e, t = {}) {
		this.installed || (en.forEach(([n, r]) => e.component(t.componentName || n, r)), this.installed = !0);
	}
};
function nn() {
	if (typeof document > "u" || document.querySelector("link[data-file-viewer-style=\"true\"]")) return;
	let e = document.createElement("link");
	e.rel = "stylesheet", e.href = I, e.dataset.fileViewerStyle = "true", document.head.appendChild(e);
}
nn();
var rn = new tn();
//#endregion
export { X as FileViewer, Qt as createFlyfishFileViewer, rn as default, $t as mountFlyfishFileViewer };
