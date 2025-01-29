"use strict";

import { Clock } from './clock.js';

const LOADING_HTML = '<loading><spinner class="dot-spin"></spinner>Retrieving data...</loading>';

function pad(v) {
	return String(v).padStart(2, '0');
}
function strtime(timestamp) {
	let d = new Date(timestamp);
	
	return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes());
}

export class Battle {
	constructor() {
		this.$clock = $(new Clock());
		this.$battleCardHeader = $("<battle-card-header>");
		this.$battleLeaderBoard = $("<battle-leaderboard>").append(LOADING_HTML);
		this.$clanInfo = $("<clan-detail>").append('<loading><i class="fa-solid fa-shield-halved">  Select a clan</i></loading>');
		this.battleCardFooter = $("<battle-card-footer>",{html: "Retrieving data..."});
		
		this.selectedClan = location.hash.substr(2);
		
		this.updateInfo();
	}
	updateView() {
		$("body").empty().append(
			this.$battleCardHeader,
			$("<battle-card-body>").append(
				this.$battleLeaderBoard,
				/*this.$clanInfo*/
			),
			this.battleCardFooter
		);		
	}
	
	updateInfo() {
		const $this = this;
		
		$.get("https://ps99.biggamesapi.io/api/activeClanBattle", function(r) {
			const $countdown = $("<battle-countdown>");
			const $progress = $("<progress-bar>");
			
			const battleData = r.data.configData;
			const battleStartTime = battleData.StartTime*1000;
			const battleEndTime = battleData.FinishTime*1000;
			
			$this.$battleCardHeader.empty().append(
				$("<battle-info>").append(
					$("<name>",{text:battleData.Title}),
					$("<duration>",{text:strtime(battleStartTime) + " - " + strtime(battleEndTime)})
				),
				$countdown,
				$("<battle-progress>").append($progress)
			);
			
			function _updateTick(time) {
				const remainingTime = (battleEndTime-time)/1000|0;
				
				$countdown.text((remainingTime/86400|0)+":"+pad(remainingTime%86400/3600|0)+":"+pad(remainingTime%3600/60|0)+":"+pad(remainingTime%60)).prepend(
					$("<i>",{class:"fa-regular fa-clock"})
				);
				$progress.width((time-battleStartTime)/(battleEndTime-battleStartTime)*100+"%");
			}
			
			_updateTick(+new Date());
			$this.$clock.on("tick", function(e) {
				_updateTick(e.originalEvent.currentTime);
				
				if(e.originalEvent.currentTime%120000 === 0) $this.getLeaderboard();
			});
			
			$this.updateView();
			$this.getLeaderboard();
			if($this.selectedClan) $this.updateClanInfo();
		});
	}
	getLeaderboard() {
		const $this = this;
		const currentTimestamp = +new Date();
		if($this.cachedLeaderboardTime && $this.cachedLeaderboardTime+90000>currentTimestamp) return;
		
		$.get("https://ps99.biggamesapi.io/api/clans?sort=Points&sortOrder=desc&pageSize=500&page=1", function(r) {
			if($this.cachedLeaderboardTime) {
				$this.previousLeaderboard = $this.cachedLeaderboard;
				$this.previousLeaderboardTime = $this.cachedLeaderboardTime;
			}
			$this.cachedLeaderboard = r.data;
			$this.cachedLeaderboardTime = currentTimestamp-currentTimestamp%60000;
			$this.battleCardFooter.html("<b>Last Update: </b>"+strtime($this.cachedLeaderboardTime));
			$this.updateLeaderboard();
		});
	}
	updateLeaderboard() {
		const $this = this;
		
		if(this.previousLeaderboardTime) var timeDiff = (this.cachedLeaderboardTime-this.previousLeaderboardTime)/60000;
		
		if(this.selectedClan) {
			var selectedClanPoint = this.cachedLeaderboard.find((a)=>a.Name === this.selectedClan).Points;
			if(this.previousLeaderboardTime) var selectedClanRate = (selectedClanPoint-this.previousLeaderboard.find((a)=>a.Name===this.selectedClan).Points)/timeDiff;
		}
		
		var scrollTop = this.$battleLeaderBoard.scrollTop();
		this.$battleLeaderBoard.empty();
		
		for(let position in this.cachedLeaderboard) ((position, clanInfo)=>{
			if(this.previousLeaderboardTime) var previousRecord = $this.previousLeaderboard.find((a)=>a.Name===clanInfo.Name);
			
			let $change = $("<change>");
			let $comparePoint = $("<diff>");
			let $compareRate = $("<overtake>");
			
			$("<clan>",{class:$this.selectedClan===clanInfo.Name?"active":""}).append(
				$("<position>",{text:position+1}),
				$("<img>",{loading:"lazy", src:clanInfo.Icon.replace("rbxassetid://","https://ps99.biggamesapi.io/image/")}).on("error", function() {
					this.src = "./img/blank.svg";
				}),
				$("<clan-info>").append(
					$("<label>",{text:"["+clanInfo.Name+"]"}),
					$("<member>",{text:(clanInfo.Members+1) + "/" + clanInfo.MemberCapacity}).prepend(
						$("<i>",{class:"fa-solid fa-user"})
					)
				),
				$("<score>").append(
					$comparePoint,
					$compareRate
				),
				$("<score>").append(
					$("<point>",{text:clanInfo.Points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}).prepend(
						$("<img>",{src:"./img/point.png"})
					),
					$change
				)
			).appendTo($this.$battleLeaderBoard).on("click", function() {
				$this.selectClan(clanInfo.Name);
				$this.updateLeaderboard();
				$this.updateClanInfo()
			});
			
			if(this.previousLeaderboardTime) {
				var pointDiffRate = (clanInfo.Points-previousRecord.Points)/timeDiff;
				
				$change.text(Math.abs(pointDiffRate).toFixed(1)+"/min");
				if(pointDiffRate>0) $change.prepend($("<i>",{class:"fa-solid fa-caret-up"}));
				else if(pointDiffRate<0) $change.prepend($("<i>",{class:"fa-solid fa-caret-down"}));
			}
			if(this.selectedClan && this.selectedClan!==clanInfo.Name) {
				let pointDiff = clanInfo.Points - selectedClanPoint;
				
				$comparePoint.text(Math.abs(pointDiff).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
				if(pointDiff>0) $comparePoint.append($("<i>",{class:"fa-solid fa-caret-up"}));
				else if(pointDiff<0) $comparePoint.append($("<i>",{class:"fa-solid fa-caret-down"}));
				
				if(this.previousLeaderboardTime) {
					let rateDiff = pointDiffRate - selectedClanRate;
					
					if((pointDiff>0&&rateDiff<0) || (pointDiff<0&&rateDiff>0)) {
						let catchUpMinutes = Math.abs(pointDiff)/Math.abs(rateDiff);
						let catchUpArr = [];
						if(catchUpMinutes>=1440) catchUpArr.push((catchUpMinutes/1440|0)+"d");
						if(catchUpMinutes>=60) catchUpArr.push((catchUpMinutes%1440/60|0)+"h");
						catchUpArr.push((catchUpMinutes%60|0)+"m");
						
						$compareRate.text(catchUpArr.join(" "));
					}
				}
			}
		})(parseInt(position), this.cachedLeaderboard[position]);
		
		if(!this.memory_autoscroll && this.selectedClan) {
			let $container = this.$battleLeaderBoard;
			let $target = this.$battleLeaderBoard.find(".active");
			
			this.$battleLeaderBoard.scrollTop($target.offset().top-($container.height()+$target.height())/2);
		}
		this.memory_autoscroll = true;
	}
	selectClan(name) {
		location.hash = "#/"+name;
		this.selectedClan = name;
	}
	updateClanInfo() {
		const $this = this;
		
		//if(!this.selectedClan) return;
		//this.$clanInfo.empty().append(LOADING_HTML);
	}
}