const config = require('./config.json');
const discord = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const client = new discord.Client({
    intents: [
        discord.GatewayIntentBits.DirectMessageReactions,
        discord.GatewayIntentBits.DirectMessageTyping,
        discord.GatewayIntentBits.DirectMessages,
        discord.GatewayIntentBits.GuildBans,
        discord.GatewayIntentBits.GuildEmojisAndStickers,
        discord.GatewayIntentBits.GuildIntegrations,
        discord.GatewayIntentBits.GuildInvites,
        discord.GatewayIntentBits.GuildMembers,
        discord.GatewayIntentBits.GuildMessageReactions,
        discord.GatewayIntentBits.GuildMessageTyping,
        discord.GatewayIntentBits.GuildMessages,
        discord.GatewayIntentBits.GuildPresences,
        discord.GatewayIntentBits.GuildScheduledEvents,
        discord.GatewayIntentBits.GuildVoiceStates,
        discord.GatewayIntentBits.GuildWebhooks,
        discord.GatewayIntentBits.Guilds,
        discord.GatewayIntentBits.MessageContent,
    ],
    partials: [discord.Partials.Channel, discord.Partials.GuildMember, discord.Partials.GuildScheduledEvent, discord.Partials.Message, discord.Partials.Reaction, discord.Partials.ThreadMember, discord.Partials.User],
});
var data = require('./data.json');
const fs = require('fs');
const { createCanvas } = require('canvas');
var queue = {};
client.on('ready', function (user) {
    console.log(`Logged in as ${user.user.tag}`);
    return;
});

client.on('messageCreate', async function (message) {
    if (message.content.includes("!authboard") && (message.author.id === message.guild.ownerId)) {
        const mentions = message.mentions.roles;
        if (mentions.size === 0) {
            message.channel.send('Please specify role mentioon')
                .then(msg => {
                    setTimeout(async () => {
                        await msg.delete();
                    }, 5000)
                });
            return;
        }
        if (mentions.size > 1) {
            message.channel.send('Please specify a siongle role mentioon')
                .then(msg => {
                    setTimeout(async () => {
                        await msg.delete();
                    }, 5000)
                });
            return;
        }
        const auth = new EmbedBuilder()
            .setTitle("Authentication")
            .setColor("000000")
            .setDescription(`Get ${mentions.first()}!`)
        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("auth").setLabel("Click to Auth").setEmoji("🛡").setStyle(ButtonStyle.Secondary),
        );
        await message.channel.send({
            embeds: [auth],
            components: [btn],
        });
        let temp = {
            [message.guild.id]: mentions.first()
        };
        try {
            delete data[message.guild.id];
        } catch (err) {

        }
        let result = { ...data, ...temp };
        fs.writeFile('./data.json', JSON.stringify(result), function () {
            data = result;
        });
        return;
    }
});
client.on('interactionCreate', async function (interaction) {
    const guildId = interaction.guild.id;
    if (interaction.customId === "auth") {
        console.log(data);
        if (await interaction.member.roles.cache.has(data[guildId].id)) {
            await interaction.reply({
                content: "You are not target of authentication",
                ephemeral: true
            });
            return;
        }
        await interaction.deferReply({
            ephemeral: true
        });
        let code = generateRandomPassword(6);
        let image = generateImage(code);
        await interaction.editReply({
            content: "Type strings in this image",
            files: [image],
            ephemeral: true
        });
        try {
            delete queue[interaction.user.id]
        } catch (err) {

        }
        let temp = {
            [interaction.user.id]: {
                user: interaction.user,
                code: code
            }
        }
        queue = { ...queue, ...temp };
        const filter = msg => msg.author.id === interaction.user.id;
        interaction.channel.awaitMessages({ filter, max: 1, time: config.time * 1000 })
            .then(async (collected) => {
                if (!collected.size) {
                    interaction.editReply({ content: "You did not type anything!", ephemeral: true });
                    delete queue[interaction.user.id];
                    return;
                }
                const raw = collected.first().content;
                collected.first().delete();
                if (raw === queue[interaction.user.id].code) {
                    interaction.editReply("Authentication success");
                    const targetRole = await interaction.guild.roles.cache.get(data[interaction.guild.id].id);
                    await interaction.member.roles.add(targetRole);
                    delete queue[interaction.user.id];
                    return;
                } else {
                    await interaction.editReply('Did not match. Please try again with re-clicking the button.');
                    delete queue[interaction.user.id];
                    return;
                }
            });
        return;
    }
});

client.login(config.token);

process.on("uncaughtException", function (err) {
    console.log(err.stack);
});

function generateRandomPassword(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters.charAt(randomIndex);
    }

    return password;
}

function generateImage(password) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '40px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText(password, 130, 110);
    const noiseAmount = 100;
    for (let i = 0; i < noiseAmount; i++) {
        const x = Math.floor(Math.random() * canvas.width);
        const y = Math.floor(Math.random() * canvas.height);
        const color = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.1)`;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 150, 150);
    }
    return canvas.toBuffer();
}