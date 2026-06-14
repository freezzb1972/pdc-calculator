import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh_common from './resources/zh/common.json';
import zh_layout from './resources/zh/layout.json';
import zh_login from './resources/zh/login.json';
import zh_projects from './resources/zh/projects.json';
import zh_projectEditor from './resources/zh/projectEditor.json';
import zh_bom from './resources/zh/bom.json';
import zh_compliance from './resources/zh/compliance.json';
import zh_dragchain from './resources/zh/dragchain.json';
import zh_roomlayout from './resources/zh/roomlayout.json';
import zh_filterLibrary from './resources/zh/admin/filterLibrary.json';
import zh_cableSpecs from './resources/zh/admin/cableSpecs.json';
import zh_gbTables from './resources/zh/admin/gbTables.json';
import zh_priceManage from './resources/zh/admin/priceManage.json';
import zh_selectionRules from './resources/zh/admin/selectionRules.json';
import zh_userManage from './resources/zh/admin/userManage.json';

import en_common from './resources/en/common.json';
import en_layout from './resources/en/layout.json';
import en_login from './resources/en/login.json';
import en_projects from './resources/en/projects.json';
import en_projectEditor from './resources/en/projectEditor.json';
import en_bom from './resources/en/bom.json';
import en_compliance from './resources/en/compliance.json';
import en_dragchain from './resources/en/dragchain.json';
import en_roomlayout from './resources/en/roomlayout.json';
import en_filterLibrary from './resources/en/admin/filterLibrary.json';
import en_cableSpecs from './resources/en/admin/cableSpecs.json';
import en_gbTables from './resources/en/admin/gbTables.json';
import en_priceManage from './resources/en/admin/priceManage.json';
import en_selectionRules from './resources/en/admin/selectionRules.json';
import en_userManage from './resources/en/admin/userManage.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        common: zh_common,
        layout: zh_layout,
        login: zh_login,
        projects: zh_projects,
        projectEditor: zh_projectEditor,
        bom: zh_bom,
        compliance: zh_compliance,
        dragchain: zh_dragchain,
        roomlayout: zh_roomlayout,
        filterLibrary: zh_filterLibrary,
        cableSpecs: zh_cableSpecs,
        gbTables: zh_gbTables,
        priceManage: zh_priceManage,
        selectionRules: zh_selectionRules,
        userManage: zh_userManage,
      },
      en: {
        common: en_common,
        layout: en_layout,
        login: en_login,
        projects: en_projects,
        projectEditor: en_projectEditor,
        bom: en_bom,
        compliance: en_compliance,
        dragchain: en_dragchain,
        roomlayout: en_roomlayout,
        filterLibrary: en_filterLibrary,
        cableSpecs: en_cableSpecs,
        gbTables: en_gbTables,
        priceManage: en_priceManage,
        selectionRules: en_selectionRules,
        userManage: en_userManage,
      },
    },
    fallbackLng: 'zh',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'pdc_language',
      caches: [],
    },
  });

export default i18n;
