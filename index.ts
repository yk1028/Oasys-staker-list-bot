import 'dotenv/config'

const STAKE_MANAGER_ABI = require('./stake-manager_abi.json')

const generate_csv = async (fileName: string) => {
    const Web3 = require('web3');
    const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc.mainnet.oasys.games"));

    const stakerManager = new web3.eth.Contract(STAKE_MANAGER_ABI, "0x0000000000000000000000000000000000001001")

    const result = await stakerManager.methods.getValidatorStakes("0x6e28e5AF24dA4Cb7Bd669332244271eDce95f747", 0, 0, 1000).call()

    const stakers = result["_stakers"]
    const stakes = result["stakes"]

    const txtHeader = ['address', 'amount'];
    const csvWriterHeader = txtHeader.map((el) => {
        return { id: el, title: el };
    });

    interface Staker {
        address: string;
        amount: string;
    }

    let results: Staker[] = [];

    for (let i = 0; i < stakers.length; i++) {
        let staker: Staker = {
            address: stakers[i],
            amount: stakes[i]
        }
        results.push(staker)
    }

    const createCsvWirter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWirter({
        path: './csv/' + fileName, 
        header: csvWriterHeader,
    });

    csvWriter.writeRecords(results).then(() => {
    console.log(fileName + ' done!');
    });
}

const telegram_bot = async () => {
    const { Telegraf } = require('telegraf')
    const cron = require('node-cron')

    const bot = new Telegraf(process.env.BOT_TOKEN)
    bot.hears('hi', (ctx) => ctx.reply('Hey there'))
    bot.hears('stakers', async (ctx) => {
        let today = new Date();
        let fileName = `stakers-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.csv`
        await generate_csv(fileName)
        ctx.replyWithDocument({source: './csv/' + fileName})
    })

    cron.schedule(process.env.CRON_SCHEDULE, async () => {
        let today = new Date();
        let fileName = `stakers-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.csv`
        await generate_csv(fileName)
        bot.telegram.sendDocument(process.env.CHAT_ID, {source: './csv/' + fileName});
    });

    bot.launch()

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

const index = async () => {
    telegram_bot();
}

index();