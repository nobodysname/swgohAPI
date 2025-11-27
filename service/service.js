const convertGuild = (data) => {
    try {
        let guild = (({ profile, member, recentTerritoryWarResult }) => ({ profile, member, recentTerritoryWarResult }))(data.guild)
        const allowed = ['playerId', 'playerName', 'galacticPower']
        guild.member = guild.member.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        return { guild }
    } catch (error) {
        console.log(error.message)
    }
}

const convertPlayer = (data) => {
    try {
        const allowed = ["name", "rosterUnit"]
        let player = data.map(obj => Object.fromEntries(Object.entries(obj).filter(([key, _]) => allowed.includes(key))))
        return player
    } catch (error) {
        console.log(error.message)   
    }
}

module.exports = {
    convertGuild,
    convertPlayer
}