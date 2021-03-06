import * as path from 'path';
import * as fse from 'fs-extra';
import { Uri } from 'vscode';
import { DMBSettings } from '../Settings';

interface CampaignConfig {
    campaignName: string;
    sourcePaths: string[];
    templatePaths: string[];
    componentPaths: string[];
    outDirectory?: string;
}

export class Campaign {
    private _path: string;
    private _config: CampaignConfig;
    private _isConfigMutated: boolean;

    constructor(campaignPath: string) {
        this._path = campaignPath;
        this._config = fse.readJsonSync(this._configPath);
        this._isConfigMutated = false;
    }

    public static async getCampaignInPath(filePath: string): Promise<Campaign | undefined> {
        if (filePath === path.dirname(filePath)) {
            return;
        }
        let stat = await fse.stat(filePath);
        if (stat.isDirectory()) {
            if (await Campaign.hasCampaignConfig(filePath)) {
                return new Campaign(filePath);
            }
        }
        if (await fse.pathExists(Uri.file(path.dirname(filePath)).fsPath)) {
            return await Campaign.getCampaignInPath(path.dirname(filePath));
        }
        return;
    }

    public static async hasCampaignConfig(campaignPath: string): Promise<boolean> {
        return await fse.pathExists(getConfigPath(campaignPath));
    }

    public static async init(campaignPath: string, campaignName: string): Promise<boolean> {
        if (!await Campaign.hasCampaignConfig(campaignPath)) {
            await fse.ensureDir(path.join(campaignPath, '.dmbinder'));
            let opts: fse.WriteOptions = {
                spaces: 4
            };
            let config: CampaignConfig = {
                campaignName: campaignName,
                sourcePaths: [],
                templatePaths: [],
                componentPaths: []
            };
            if (DMBSettings.generateGettingStartedEnabled) {
                config.sourcePaths.push('./sources');
                config.templatePaths.push('./templates');
                config.componentPaths.push('./components');
                await fse.ensureDir(path.join(campaignPath, 'sources'));
                await fse.ensureDir(path.join(campaignPath, 'templates'));
                await fse.ensureDir(path.join(campaignPath, 'components'));
            }
            await fse.writeJSON(getConfigPath(campaignPath), config, opts);
            return true;
        }
        return false;
    }

    private get _configPath(): string {
        return getConfigPath(this._path);
    }

    public async reloadConfig(ignoreMutated: boolean = true): Promise<void> {
        if (!ignoreMutated && this._isConfigMutated) {
            await this.saveConfig();
        }
        this._config = await fse.readJSON(this._configPath);
        this._isConfigMutated = false;
    }

    public async saveConfig(): Promise<void> {
        if (await Campaign.hasCampaignConfig(this._path)) {
            let opts: fse.WriteOptions = {
                spaces: 4
            };
            await fse.writeJSON(this._configPath, this._config, opts);
            this._isConfigMutated = false;
        }
    }

    public set campaignName(name: string) {
        this._config.campaignName = name;
        this._isConfigMutated = true;
    }

    public get campaignName(): string {
        return this._config.campaignName;
    }

    public get campaignPath(): string {
        return this._path;
    }

    public get sourcePaths(): string[] {
        return this._config.sourcePaths;
    }

    public get templatePaths(): string[] {
        return this._config.templatePaths;
    }

    public get componentPaths(): string[] {
        return this._config.componentPaths;
    }

    public set outDirectory(path: string | undefined) {
        this._config.outDirectory = path;
        this._isConfigMutated = true;
    }

    public get outDirectory(): string | undefined {
        return this._config.outDirectory;
    }
}

function getConfigPath(rootPath: string): string {
    return path.resolve(Uri.file(rootPath).fsPath, '.dmbinder', 'campaign.json');
}