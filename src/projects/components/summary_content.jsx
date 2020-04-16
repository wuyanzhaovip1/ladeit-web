import React from 'react';
import ReactDOM from 'react-dom';
import Moment from 'moment';
import {
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    Info as InfoIcon
} from '@material-ui/icons'
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';
import {
    withStyles,Button,Paper,Typography,Grid,IconButton,Tooltip,Divider,
    Card,CardHeader,CardContent,CardActions
} from '@material-ui/core';

import Alert from '@/components/Dialog/Alert.jsx'
import AlertEventList from '@/projects/summary/index.jsx'
import Icons from '@/components/Icons/icons.jsx'

import moment from 'moment'
import CreatePipe from './summary_content_pipe.jsx'
import CreateHeatmap from './summary_content_heatmap.jsx'
import Service from '../Service'
import AuthFilter from '@/AuthFilter.jsx'
import intl from 'react-intl-universal'

const styles = theme => ({
    box:{
        //padding:'32px 24px'
        margin:'0 -8px'
    },
    paper:{
        padding:'16px',
        margin:'8px'
    },
    pannel:{
        margin:'8px',
        "&>div:not(:last-child)":{
            padding:'16px 0',
            textAlign:'center',
            //borderRight:'1px solid rgba(232, 232, 232, 0.6)'
        }
    },


    header:{
        //margin:'16px 8px'
        margin:'8px'
    },
    headerRow:{
        textAlign:'center',
        fontWeight:400,
        padding:'24px 0',
        '&:not(:last-child)':{
            borderRight:'1px solid rgba(232, 232, 232, 0.6)'
        },
        '& .name':{
            fontWeight:400
        }
    },
    info:{
        height: '280px',
        textAlign:'center',
        position: 'relative',
        '& .pipeChart .MuiButton-root':{
            width:'46px'
        }
    },
    operation:{
        position:'absolute',
        right:'32px',
        '& .icon':{
            fontSize:'3rem'
        }
    },

    eventsHeader:{
        padding:'12px 0 !important',
        '& .MuiCardHeader-title':{
            fontSize:'1rem'
        }
    }
})


function renderPipeChart(data){
    let view = this;
    let editHtml = `<div class="g2-guide-html">
        <p class="title">pod</p>
        <div class="value">
            <input type="number" value="${data._pod}" class="input"/>
            <div>
                <button class="cancel MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-outlinedSizeSmall MuiButton-sizeSmall fl" tabindex="0" type="button">`+ intl.get('cancel') +`</button>
                <button class="ok MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-outlinedPrimary MuiButton-outlinedSizeSmall fr" tabindex="0" type="button">`+ intl.get('confirm') +`</button>
            </div>
        </div>
    </div>`
    let showHtml = `<div class="g2-guide-html">
        <p class="title">pod</p>
        <p class="value">${data._pod}</p>
    </div>`
    //
    let pipeChart = document.getElementById("pipeChart");
    if(pipeChart){// 验证
        pipeChart.onclick = function(e){
            let el = e.target;
            if(el.className.indexOf('cancel')>-1){
                view.loadPipeChart_cancel();
            }else if(el.className.indexOf('ok')>-1){
                let input = pipeChart.querySelector('.input');
                view.loadPipeChart_save(input.value - 0);
            }
        }
        pipeChart.onkeydown = _.debounce(function(e){
            let el = e.target;
            if(el.tagName=="INPUT"){
                let val = el.value - 0;
                if(val<0){
                    el.value = 0;
                }
            }
        },1000)
    }
    //
    return function(isEdit){
        let html = showHtml;// _.template
        if(isEdit!=void 0){
            html = editHtml;
        }
        try{
            CreatePipe('pipeChart',view.state.pod,html);
        }catch (e) {
            console.error('heatmapChart faild')
        }
    }
}

let timer = null;

@withStyles(styles)
@AuthFilter
class Index extends React.PureComponent {
    componentWillMount(){}

    componentDidMount(){
        this.loadService();
    }

    componentWillUnmount(){
        clearTimeout(timer);
    }

    loadService(){
        const sc = this;
        const {params} = this.props;
        Service.serviceMap({ServiceId:'',ServiceGroup:params._group,ServiceName:params._name},(result)=>{
            let id = result.id;
            sc.loadServiceInfo(id);
            sc.loadPipeChart(result);
            sc.loadHeatmapChart(id);
            sc.loadEventNote(id);
            //
            sc.setState({service:result})
        })
    }

    loadEventNote(id){
        const sc = this;
        let info = sc.state.info;
        let startTime = moment().format('YYYY-MM-DD') + ' 00:00';
        Service.eventNote({serviceId:id,pageSize:1000,pageNum:1,startTime:startTime},function (res) {
            res && sc.setState({eventList:res.records,eventLoaded:true})
        })
        //
        timer = setTimeout(function () {
            sc.loadEventNote(id)
        },40000)
    }

    loadServiceInfo(id){
        const sc = this;
        let info = sc.state.info;
        Service.serviceInfoMap({ServiceId:id},function(res){
            res.release_text = Service.STATUS2(res.status);// TODO runStatus
            res.status_text = Service.STATUS(res.status);
            res.alltime_text = res.releaseAt ? Moment(res.releaseAt).fromNow(true) : ' 一 ';
            res.duration_text = res.duration ? Moment(res.duration).fromNow(true) : ' 一 ';
            sc.state.info = _.extend(info,res);
            sc.forceUpdate();
        })
    }

    loadPipeChart(serviceData){
        const sc = this;
        const id = serviceData.id;
        if(serviceData.status == -1){
            let pod = _.extend(sc.state.pod,{SUM:0});
            pod._pod = pod.SUM;
            sc.renderPipeChart = renderPipeChart.call(sc,pod);
            sc.renderPipeChart();
            sc.forceUpdate();
        }else{
            Service.serviceInfoScale(id,function(res) {
                let pod = _.extend(sc.state.pod,res);
                pod._pod = pod.SUM;
                sc.renderPipeChart = renderPipeChart.call(sc,pod);
                sc.renderPipeChart();
            })
        }
    }

    loadPipeChart_save = (value)=>{
        const sc = this;
        let pod = sc.state.pod;
        let service = sc.state.service;
        Service.serviceInfoScaleUpdate({serviceId:service.id,count:value},function(res){
            sc.loadPipeChart(service);
        })
    }

    loadPipeChart_cancel = ()=>{
        const sc = this;
        let pod = sc.state.pod;
        pod._pod = pod.SUM;
        sc.renderPipeChart = renderPipeChart.call(sc,pod);
        sc.renderPipeChart();
    }

    loadHeatmapChart(id){
        //CreateHeatmap('heatmapChart');
        let date = Moment();
        let end = date.format('YYYY-MM-DD'); // '2019-12-12';
        let start = date.subtract(180, 'days').format('YYYY-MM-DD');
        Service.serviceHeatmapChart({TargetId:id, Startdate:start ,EndDate:end },function(res){
            try{
                CreateHeatmap('heatmapChart',res,start,end);
            }catch (e) {
                console.error('heatmapChart faild')
            }
        })
    }

    state = {
        service:{},
        info:{releaseNum:"-",imageNum:"-",image_version:'-',duration:'-',release_text:'-',status_text:'-'},
        pod:{Running:0,Pending:0,Succeeded:0,Failed:0,Unknown:0,SUM:1,_pod:0},
        eventList:[],
        eventLoaded:false,
    }

    showMoreEventList = ()=>{
        const sc = this;
        sc.refs.$alert.onOpen({
            open:true,
            DialogContent:<AlertEventList service={sc.state.service}/>
        })
    }

    toUrl(url){
        return ()=>{
            History.push(url)
        }
    }

    setPipeChart = (num)=>{
        let sc = this;
        let size = sc.state.pod._pod + num;
        if(size>-1){
            sc.state.pod._pod = size;
            sc.renderPipeChart = renderPipeChart.call(sc,sc.state.pod);
            sc.renderPipeChart(true);
        }
    }

    render(){
        const {classes,params} = this.props;
        const { service,info,pod,eventList,eventLoaded } = this.state;
        let imageUrl = `/releases/${params._group}/${params._name}/${info.imageVersion}?id=${info.imageId}`;
        let imagesUrl = `/releases/${params._group}/${params._name}/common`;
        let deploymentsUrl = `/deployments/${params._group}/${params._name}/common`;
        let auth = this.getServiceAuth(service);

        return (
            <div className={classes.box}>
                <Paper className={`flex-r ${classes.header}`} >
                    <div className={`flex-box ${classes.headerRow}`} >
                        <Typography variant="body2" gutterBottom>{intl.get('services.serviceStatus')}</Typography>
                        <Typography variant="h5" className="name">{info.status_text}</Typography>
                    </div>
                    <div className={`flex-box ${classes.headerRow}`}>
                        <Typography variant="body2" gutterBottom>{intl.get('services.serviceTime')}</Typography>
                        <Typography variant="h5" className="name">{info.duration_text}</Typography>
                    </div>
                    <div className={`flex-box ${classes.headerRow}`}>
                        <Typography variant="body2" gutterBottom>{intl.get('services.serviceImage')}</Typography>
                        <Typography variant="h5" className="name link1" onClick={this.toUrl(imageUrl)}>{info.imageVersion}</Typography>
                        <Typography variant="h5">{!info.imageVersion && ' 一 '}</Typography>
                    </div>
                    <div className={`flex-box ${classes.headerRow}`}>
                        <Typography variant="body2" gutterBottom>{intl.get('services.serviceDeploy')}</Typography>
                        <Typography variant="h5" className="name">{info.release_text}</Typography>
                    </div>
                </Paper>

                <Grid container spacing={2}>
                    <Grid item xs={5} >
                        <Paper className={`flex-center ${classes.paper} ${classes.info}`}>
                            <div id="pipeChart" style={{width:'400px',padding:'32px 0'}}></div>
                            {
                                service.status!='0' || (
                                    <div className={`flex-c ${classes.operation}`}>
                                        <div className="flex-box">
                                            {
                                                auth('X') ? (
                                                    <Tooltip title="Scale Up" placement="right">
                                                        <IconButton size="small" onClick={()=>{this.setPipeChart(+1)}} ><ExpandLessIcon className="icon"/></IconButton>
                                                    </Tooltip>
                                                ):(
                                                    <Tooltip title={intl.get('tipsNoAuthority')} placement="right">
                                                        <IconButton size="small" style={{opacity:.4}} ><ExpandLessIcon className="icon"/></IconButton>
                                                    </Tooltip>
                                                )
                                            }
                                        </div>
                                        <div className="flex-box">
                                            {
                                                auth('X') ? (
                                                    <Tooltip title="Scale Down" placement="right">
                                                        <IconButton size="small" onClick={()=>{this.setPipeChart(-1)}}><ExpandMoreIcon className="icon"/></IconButton>
                                                    </Tooltip>
                                                ):(
                                                    <Tooltip title={intl.get('tipsNoAuthority')} placement="right">
                                                        <IconButton size="small" style={{opacity:.4}} ><ExpandMoreIcon className="icon"/></IconButton>
                                                    </Tooltip>
                                                )
                                            }
                                        </div>
                                    </div>
                                )
                            }
                        </Paper>
                    </Grid>
                    <Grid item xs={2} >
                        <Paper className={`flex-c ${classes.pannel} ${classes.info}`}>
                            <div className="flex-box flex-center" >
                                <div className="">
                                    <Typography variant="h5" className="red" gutterBottom >{info.alltime_text}</Typography>
                                    <Typography variant="body2" >
                                        <span className="text">{intl.get('services.serviceAllTime')}</span>
                                        <Tooltip title={intl.get('services.serviceAllTimeMemo')}><InfoIcon style={{fontSize:'14px',verticalAlign:'middle',marginLeft:'3px'}}/></Tooltip>
                                    </Typography>
                                </div>
                            </div>
                            <Divider light={true}/>
                            <div className="flex-box flex-center" >
                                <div className="">
                                    <Typography variant="h5" className="link1 red" gutterBottom onClick={this.toUrl(deploymentsUrl)}>{info.releaseNum}</Typography>
                                    <Typography variant="body2" >{intl.get('services.serviceDeployNum')}</Typography>
                                </div>
                            </div>
                            <Divider light={true}/>
                            <div className="flex-box flex-center" >
                                <div className="">
                                    <Typography variant="h5" className="link1 red" gutterBottom onClick={this.toUrl(imagesUrl)}>{info.imageNum}</Typography>
                                    <Typography variant="body2" >{intl.get('services.serviceImageNum')}</Typography>
                                </div>
                            </div>
                        </Paper>
                    </Grid>
                    <Grid item xs={5} >
                        <Card className={`${classes.pannel} ${classes.info}`}>
                            <CardHeader
                                className={classes.eventsHeader}
                                title={intl.get('services.serviceActivity')}
                            />
                            <Divider light={true} />
                            <CardContent
                                style={{height: 'calc(100% - 86px)', overflowY: 'auto', padding: 0}}>
                                {
                                    eventLoaded && (eventList.length ? eventList.map(function (one, i) {
                                        return (
                                            <>
                                                <div className="service_event_item" key={i}>
                                                    <div>{one.time && moment(one.time).format("YYYY/MM/DD HH:mm:ss")+' '} {intl.get('services.events.type')}  : {one.type} &nbsp;&nbsp;{intl.get('services.events.mode')}  : {one.reason} &nbsp;&nbsp; <Icons.TimeT data={one.startTime} /> </div>
                                                    <div>{one.kind}/{one.name}</div>
                                                    <Typography variant="body2">{one.note}</Typography>
                                                </div>
                                                <Divider light={true}/>
                                            </>
                                        )
                                    }) : <Icons.NodataT/>)
                                }
                                { !eventLoaded &&  <Icons.Loading />}
                            </CardContent>
                            <Divider light={true} />
                            <CardActions style={{padding:0}}>
                                <Button size="small" color="primary" fullWidth style={{padding:0,height:'40px',marginRight:'0 !important'}} onClick={this.showMoreEventList}>{intl.get('more')}</Button>
                            </CardActions>
                        </Card>
                    </Grid>
                </Grid>

                <Paper className={classes.paper}>
                    <div id="heatmapChart"  style={{width:'800px'}} />
                </Paper>
                <Alert ref="$alert"/>
            </div>
        )
    }
}

export default Index;
