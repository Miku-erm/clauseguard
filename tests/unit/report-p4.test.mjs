import {describe,it,expect}from'vitest';
import {renderReport}from'../../scripts/eval-report.mjs';
const empty={at:'2026-10-13T20:00:00Z',documents:[],micro:{tp:0,fp:0,fn:0,precision:null,recall:null,f1:null},macro:{precision:null,recall:null,f1:null},evidenceValidity:null,severityAgreement:null,totalModelCalls:0,invalidJsonCount:0,modelResponseFailures:0,unevaluated:[],byCategory:[]};
describe('evaluation report presentation',()=>{
 it('keeps empty measurements undefined and provisional',()=>{const report=renderReport(empty,[]);expect(report).toContain('PROVISIONAL');expect(report).toContain('precision N/A');expect(report).not.toContain('NaN');expect(report).not.toContain('100.0%');expect(report).toContain('Bu uygulama hukuki tavsiye vermez.');});
 it('renders a missing evaluation without converting it to a correct negative',()=>{const m={...empty,unevaluated:['missing'],documents:[{sourceId:'missing',metrics:null,analysisCoverage:{analyzed:0,total:12},extractionCoverage:'PARTIAL'}]};expect(renderReport(m,[])).toContain('| missing | N/A | N/A | N/A |');expect(renderReport(m,[])).toContain('0/12 (PARTIAL)');});
 it('renders actual nonzero errors and official metadata',()=>{const m={...empty,micro:{tp:2,fp:1,fn:3,precision:2/3,recall:0.4,f1:0.5}};const report=renderReport(m,[{id:'source',url:'https://official.example/terms',accessedAt:empty.at,region:'TR',documentHash:'hash'}]);expect(report).toContain('TP 2, FP 1, FN 3');expect(report).toContain('66.7%');expect(report).toContain('[source](https://official.example/terms)');});
});
