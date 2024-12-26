import fs from 'fs/promises';
import path from 'path';
import logger from '../../utils/logger.js';
import { ABSApiClient } from './ABSApiClient.js';
import { DataFlow, DataFlowCache, DataQueryOptions } from '../../types/abs.js';

export class DataFlowService {
    private cache: DataFlowCache | null = null;
    private readonly cacheFilePath: string;
    private readonly refreshIntervalMs: number;
    private readonly apiClient: ABSApiClient;

    constructor(cacheFilePath: string, refreshIntervalHours: number = 24) {
        this.cacheFilePath = cacheFilePath;
        this.refreshIntervalMs = refreshIntervalHours * 60 * 60 * 1000;
        this.apiClient = new ABSApiClient();

        logger.info('DataFlowService initialized', {
            cacheFilePath,
            refreshIntervalHours,
            refreshIntervalMs: this.refreshIntervalMs
        });
    }

    async getDataFlows(forceRefresh: boolean = false): Promise<DataFlow[]> {
        logger.debug('Getting data flows', { forceRefresh });
        try {
            if (!this.cache) {
                logger.info('Cache not initialized, attempting to load from file');
                this.cache = await this.loadCache();
            }

            if (forceRefresh || !this.isCacheValid()) {
                logger.info('Cache invalid or refresh forced, fetching new data');
                const flows = await this.fetchDataFlows();
                this.cache = {
                    lastUpdated: new Date(),
                    flows
                };
                await this.saveCache(this.cache);
                return flows;
            }

            logger.debug('Returning cached data flows', {
                flowCount: this.cache?.flows.length ?? 0,
                cacheAge: this.cache ? new Date().getTime() - new Date(this.cache.lastUpdated).getTime() : 0
            });
            return this.cache?.flows ?? [];

        } catch (error) {
            logger.error('Error getting data flows', { error });
            throw error;
        }
    }

    async getFlowData(flowId: string, dataKey: string = 'all', options?: DataQueryOptions) {
        logger.info('Getting flow data', { flowId, dataKey, options });
        return this.apiClient.getData(flowId, dataKey, options);
    }

    private async fetchDataFlows(): Promise<DataFlow[]> {
        logger.info('Fetching data flows');
        try {
            const parsed = await this.apiClient.getDataFlows();
            return this.extractDataFlows(parsed);
        } catch (error) {
            logger.error('Error fetching data flows', { error });
            throw error;
        }
    }

    private extractDataFlows(parsed: any): DataFlow[] {
        logger.debug('Extracting data flows from parsed XML');
        try {
            // Path to dataflows based on SDMX-ML format
            const dataflows = parsed.Structure?.Dataflows?.Dataflow || [];
            const flows = Array.isArray(dataflows) ? dataflows : [dataflows];

            return flows.map((flow: any) => {
                const dataFlow: DataFlow = {
                    id: flow.id,
                    agencyID: flow.agencyID,
                    version: flow.version,
                    name: flow.Name?._text || '',
                    description: flow.Description?._text || ''
                };

                // Add structure reference if available
                if (flow.Structure?.Ref) {
                    dataFlow.structure = {
                        id: flow.Structure.Ref.id,
                        version: flow.Structure.Ref.version,
                        agencyID: flow.Structure.Ref.agencyID
                    };
                }

                return dataFlow;
            });
        } catch (error) {
            logger.error('Error extracting data flows from parsed XML', { error });
            throw error;
        }
    }

    private async loadCache(): Promise<DataFlowCache | null> {
        logger.debug('Loading cache from file', { path: this.cacheFilePath });
        try {
            const data = await fs.readFile(this.cacheFilePath, 'utf8');
            const cache = JSON.parse(data) as DataFlowCache;
            cache.lastUpdated = new Date(cache.lastUpdated);
            logger.info('Successfully loaded cache', {
                flowCount: cache.flows.length,
                lastUpdated: cache.lastUpdated
            });
            return cache;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                logger.info('No cache file found', { path: this.cacheFilePath });
                return null;
            }
            logger.error('Error loading cache', { error });
            throw error;
        }
    }

    private async saveCache(cache: DataFlowCache): Promise<void> {
        logger.debug('Saving cache to file', { 
            path: this.cacheFilePath,
            flowCount: cache.flows.length 
        });
        try {
            await fs.mkdir(path.dirname(this.cacheFilePath), { recursive: true });
            await fs.writeFile(this.cacheFilePath, JSON.stringify(cache, null, 2));
            logger.info('Successfully saved cache');
        } catch (error) {
            logger.error('Error saving cache', { error });
            throw error;
        }
    }

    private isCacheValid(): boolean {
        if (!this.cache) {
            logger.debug('Cache is null');
            return false;
        }

        const age = new Date().getTime() - new Date(this.cache.lastUpdated).getTime();
        const isValid = age < this.refreshIntervalMs;
        
        logger.debug('Checking cache validity', {
            age,
            refreshIntervalMs: this.refreshIntervalMs,
            isValid
        });
        
        return isValid;
    }

    // Utility method to format a dataflow identifier for use in data queries
    public static formatDataflowIdentifier(flow: DataFlow): string {
        return `${flow.agencyID},${flow.id},${flow.version}`;
    }
}